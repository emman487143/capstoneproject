import { Head, router, useForm, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { FormEvent, useEffect } from 'react';
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

type IndexPageProps = SharedData & {
    logs: PaginatedResponse<Log>;
    branches: Branch[];
    currentBranch: Branch | null;
    filters: {
        action?: string;
        branch?: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Inventory Log', href: route('inventory.logs.index') },
];

const actionBadgeClasses: Record<string, string> = {
    batch_created: 'bg-blue-500',
    portions_created: 'bg-sky-500',
    deducted_for_sale: 'bg-green-500',
    adjustment_waste: 'bg-red-500',
    adjustment_spoilage: 'bg-orange-500',
    adjustment_theft: 'bg-purple-600',
    adjustment_other: 'bg-gray-500',
    portion_restored: 'bg-emerald-500',
    transfer_initiated: 'bg-yellow-500 text-black',
    transfer_received: 'bg-yellow-400 text-black',
    batch_count_corrected: 'bg-blue-600',
};

export default function Index({ logs, branches, currentBranch, filters }: IndexPageProps) {
    const { auth, flash } = usePage<SharedData>().props;
    const { data, setData, get, processing } = useForm({
        action: filters.action || 'all',
        branch: filters.branch || currentBranch?.id.toString() || '',
    });

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }
        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const handleFilter = (e: FormEvent) => {
        e.preventDefault();
        get(route('inventory.logs.index'), {
            preserveState: true,
            preserveScroll: true,
        });
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
                        <form onSubmit={handleFilter} className="flex items-end gap-4 pt-2">
                            <div className="flex-1">
                                <Label htmlFor="action" className="sr-only">
                                    Action
                                </Label>
                                <Select name="action" value={data.action} onValueChange={(value) => setData('action', value)}>
                                    <SelectTrigger className="w-full md:w-[200px]">
                                        <SelectValue placeholder="Filter by action" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Actions</SelectItem>
                                        <SelectItem value="batch_created">Batch Created</SelectItem>
                                        <SelectItem value="portions_created">Portions Created</SelectItem>
                                        <SelectItem value="deducted_for_sale">Deducted for Sale</SelectItem>
                                        <SelectItem value="adjustment_waste">Adjustment: Waste</SelectItem>
                                        <SelectItem value="adjustment_spoilage">Adjustment: Spoilage</SelectItem>
                                        <SelectItem value="adjustment_theft">Adjustment: Theft</SelectItem>
                                        <SelectItem value="adjustment_other">Adjustment: Other</SelectItem>
                                        <SelectItem value="portion_restored">Portion Restored</SelectItem>
                                        <SelectItem value="transfer_initiated">Transfer Initiated</SelectItem>
                                        <SelectItem value="transfer_received">Transfer Received</SelectItem>
                                        <SelectItem value="batch_count_corrected">Count Corrected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" disabled={processing}>
                                Filter
                            </Button>
                        </form>
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
                                                (log.batch ? `Batch #${log.batch.batch_number}` : 'N/A');

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
                                                                actionBadgeClasses[log.action] || 'bg-gray-500'
                                                            )}
                                                        >
                                                            {log.action.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <LogDetail
                                                            action={log.action}
                                                            details={
                                                                log.formatted_details || {
                                                                    title: '',
                                                                    description: '',
                                                                    quantityInfo: '',
                                                                    reason: '',
                                                                    metadata: [],
                                                                }
                                                            }
                                                            rawDetails={log.parsed_details || (typeof log.details === 'string' ? JSON.parse(log.details) : log.details)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{log.user?.name || 'System'}</TableCell>
                                                    <TableCell className="whitespace-nowrap">
                                                        {format(new Date(log.created_at), 'MMM d, yyyy')}
                                                        <div className="text-xs text-muted-foreground">
                                                            {format(new Date(log.created_at), 'h:mm a')}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                <div className="text-muted-foreground">No log entries found for this branch.</div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Responsive mobile view for smaller screens */}
                        <div className="md:hidden mt-4">
                            <p className="text-sm text-muted-foreground mb-2">
                                For best experience viewing detailed logs, please rotate your device to landscape mode or use a
                                larger screen.
                            </p>
                        </div>
                    </CardContent>
                </Card>
                {logs.last_page > 1 && (
                    <div className="mt-6 flex justify-center">
                        <Pagination links={logs.links} />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
