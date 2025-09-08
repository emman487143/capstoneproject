import { Head, router, useForm, usePage, usePoll } from '@inertiajs/react';
import { format } from 'date-fns';
import { FormEvent, useEffect, useState, ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Branch, BreadcrumbItem, Log, PaginatedResponse, SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Pagination from '@/components/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import BranchSwitcher from '@/components/branch-switcher';
import LogDetail from './Partials/LogDetail';
import { Input } from '@/components/ui/input';
import { useDebouncedCallback } from 'use-debounce';
import { X, Search } from 'lucide-react';

type IndexPageProps = SharedData & {
    logs: PaginatedResponse<Log>;
    branches: Branch[];
    currentBranch: Branch | null;
    filters: {
        action?: string;
        branch?: string;
        search?: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Inventory Log', href: route('inventory.logs.index') },
];

const actionBadgeClasses: Record<string, string> = {
    // Greens for additions/sales
    batch_created: 'bg-green-600 hover:bg-green-600/90',
    deducted_for_sale: 'bg-green-500 hover:bg-green-500/90',
    portion_restored: 'bg-emerald-500 hover:bg-emerald-500/90',
    quantity_restored: 'bg-emerald-600 hover:bg-emerald-600/90',
    batch_count_corrected: 'bg-sky-600 hover:bg-sky-600/90',

    // Reds & Oranges for negative adjustments
    adjustment_waste: 'bg-red-500 hover:bg-red-500/90',
    adjustment_spoilage: 'bg-orange-500 hover:bg-orange-500/90',
    adjustment_theft: 'bg-red-700 hover:bg-red-700/90',
    adjustment_damaged: 'bg-orange-600 hover:bg-orange-600/90',
    adjustment_missing: 'bg-purple-600 hover:bg-purple-600/90',
    adjustment_expired: 'bg-amber-600 hover:bg-amber-600/90',
    adjustment_staff_meal: 'bg-pink-500 hover:bg-pink-500/90',
    adjustment_other: 'bg-gray-500 hover:bg-gray-500/90',

    // Yellows/Blues for transfers
    transfer_initiated: 'bg-blue-500 hover:bg-blue-500/90',
    transfer_received: 'bg-blue-400 hover:bg-blue-400/90 text-blue-950',
    transfer_cancelled: 'bg-yellow-500 hover:bg-yellow-500/90 text-yellow-950',
    transfer_rejected: 'bg-yellow-600 hover:bg-yellow-600/90 text-yellow-950',

    // Deprecated/Internal
    portions_created: 'bg-sky-500 hover:bg-sky-500/90',
};

export default function Index({ logs, branches, currentBranch, filters }: IndexPageProps) {
    const { auth, flash } = usePage<SharedData>().props;
    const { data, setData } = useForm({
        action: filters.action || 'all',
        branch: filters.branch || currentBranch?.id.toString() || '',
        search: filters.search || '',
    });
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(route('inventory.logs.index'), { search: value }, { preserveState: true, replace: true });
    }, 300);

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        debouncedSearch(value);
    };
usePoll(10000, {
        only: ['logs'],
  onStart() {
      console.log('checking update')
  },
  onFinish() {
      console.log('finished checking')
  }
})
    const clearSearch = () => {
        setSearchTerm('');
        router.get(route('inventory.logs.index'), {}, { preserveState: true, replace: true });
    };
    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }
        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    // Instant action filter handler
    const handleActionChange = (value: string) => {
        setData('action', value);
        router.get(route('inventory.logs.index'), {
            ...data,
            action: value,
            search: searchTerm,
        }, { preserveState: true, replace: true });
    };

    const handleBranchChange = (branchId: string) => {
        const newParams: { branch: string; action?: string } = { branch: branchId };
        if (data.action && data.action !== 'all') {
            newParams.action = data.action;
        }
        router.get(route('inventory.logs.index'), newParams, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory Log" />
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <Heading
                        title="Inventory Log"
                        description={`A complete history of inventory actions for ${currentBranch?.name ?? 'all branches'}.`}
                    />
                    {auth.user.is_admin && branches.length > 1 && (
                        <BranchSwitcher branches={branches} currentBranch={currentBranch} onBranchChange={handleBranchChange} />
                    )}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Filter Logs</CardTitle>
                        <div className="flex items-end gap-4 pt-2">
                            <div className="flex-1">
                                <Label htmlFor="action" className="sr-only">
                                    Action
                                </Label>
                                <Select
                                    name="action"
                                    value={data.action}
                                    onValueChange={handleActionChange}
                                >
                                    <SelectTrigger className="w-full md:w-[200px]">
                                        <SelectValue placeholder="Filter by action" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Actions</SelectItem>
                                        <SelectItem value="batch_created">Batch Created</SelectItem>
                                        <SelectItem value="deducted_for_sale">Deducted for Sale</SelectItem>
                                        <SelectItem value="batch_count_corrected">Count Corrected</SelectItem>
                                        <SelectItem value="portion_restored">Portion Restored</SelectItem>
                                        <SelectItem value="quantity_restored">Quantity Restored</SelectItem>
                                        <SelectItem value="adjustment_waste">Adj: Waste</SelectItem>
                                        <SelectItem value="adjustment_spoilage">Adj: Spoilage</SelectItem>
                                        <SelectItem value="adjustment_damaged">Adj: Damaged</SelectItem>
                                        <SelectItem value="adjustment_expired">Adj: Expired</SelectItem>
                                        <SelectItem value="adjustment_missing">Adj: Missing</SelectItem>
                                        <SelectItem value="adjustment_theft">Adj: Theft</SelectItem>
                                        <SelectItem value="adjustment_staff_meal">Adj: Staff Meal</SelectItem>
                                        <SelectItem value="adjustment_other">Adj: Other</SelectItem>
                                        <SelectItem value="transfer_initiated">Transfer Initiated</SelectItem>
                                        <SelectItem value="transfer_received">Transfer Received</SelectItem>
                                        <SelectItem value="transfer_cancelled">Transfer Cancelled</SelectItem>
                                        <SelectItem value="transfer_rejected">Transfer Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by item, batch, or user..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className="pl-10 w-full md:w-[220px] lg:w-[320px]"
                                />
                                {searchTerm && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6"
                                        onClick={clearSearch}
                                        tabIndex={-1}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-1/5">Item</TableHead>
                                        <TableHead className="w-1/6">Action</TableHead>
                                        <TableHead className="w-2/5">Details</TableHead>
                                        <TableHead className="w-1/6">User</TableHead>
                                        <TableHead className="w-1/6">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.data.length > 0 ? (
                                        logs.data.map((log) => {
                                            const itemName =
                                                log.batch?.inventory_item?.name ||
                                                log.portion?.batch?.inventory_item?.name ||
                                                'Unknown Item';

                                            const itemIdentifier =
                                                log.portion?.label ||
                                                (log.batch?.label ? log.batch.label :
                                                    log.batch ? `Batch #${log.batch.batch_number}` : 'N/A');

                                            // Check if this is a portion-tracked item
                                            const isPortion = !!log.portion;

                                            // Format JSON details for debugging if needed
                                            const rawDetails =
                                                typeof log.details === 'string'
                                                    ? JSON.parse(log.details)
                                                    : log.details;



                                            return (
                                                <TableRow key={log.id} className="hover:bg-muted/50">
                                                    <TableCell>
                                                        <div className="font-medium">{itemName}</div>
                                                        {isPortion ? (
                                                            <div className="text-xs rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 inline-block mt-1">
                                                                {itemIdentifier}
                                                            </div>
                                                        ) : log.batch?.label ? (
                                                            <div className="text-xs rounded bg-slate-100/70 dark:bg-slate-800/70 px-1.5 py-0.5 inline-block mt-1 font-mono">
                                                                {itemIdentifier}
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-muted-foreground">
                                                                {itemIdentifier}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={cn(
                                                                'text-white whitespace-nowrap',
                                                                actionBadgeClasses[log.action] || 'bg-gray-500 hover:bg-gray-500/90'
                                                            )}
                                                        >
                                                            {log.action.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <LogDetail
                                                            details={
                                                                log.formatted_details || {
                                                                    quantityInfo: '',
                                                                    description: '',
                                                                    metadata: [],
                                                                }
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>{log.user?.name || 'System'}</TableCell>
                                                    <TableCell className="whitespace-nowrap">
                                                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-4">
                                                No logs found for the selected filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
                {logs.last_page > 1 && (
                    <Pagination
                        className="mt-6 flex justify-center"
                        links={logs.links}
                    />
                )}
            </div>
        </AppLayout>
    );
}
