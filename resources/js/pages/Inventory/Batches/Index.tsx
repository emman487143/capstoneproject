import AppLayout from '@/layouts/app-layout';
import { InventoryBatch, InventoryItem, PageProps, Paginator, Branch } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch'; // Added import for Switch component
import {
    ChevronDown,
    PlusCircle,
    MoreHorizontal,
    Edit,
    MinusCircle,
    EyeOff
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import Pagination from '@/components/pagination';
import { format, addDays, isBefore } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import Heading from '@/components/heading';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label'; // Added import for Label component
import { useEffect, useState } from 'react'; // Added import for useState

interface IndexProps extends PageProps {
    batches: Paginator<InventoryBatch>;
    filteredItem?: InventoryItem;
    currentBranch?: Branch | null;
}

export default function Index({ batches, filteredItem, currentBranch }: IndexProps) {
    // Add state to track whether to show empty batches
    const [showEmptyBatches, setShowEmptyBatches] = useState(true);

    // Try to load preference from localStorage on component mount
    useEffect(() => {
        const savedPreference = localStorage.getItem('showEmptyBatches');
        if (savedPreference !== null) {
            setShowEmptyBatches(savedPreference === 'true');
        }
    }, []);

    // Save preference to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('showEmptyBatches', String(showEmptyBatches));
    }, [showEmptyBatches]);

    // Filter batches based on the toggle state
    const filteredBatches = showEmptyBatches
        ? batches.data
        : batches.data.filter(batch => parseFloat(batch.remaining_quantity.toString()) > 0);

    // Calculate empty batches count for display
    const emptyBatchesCount = batches.data.filter(
        batch => parseFloat(batch.remaining_quantity.toString()) <= 0
    ).length;

    // This page is now always filtered by an item, so filteredItem is required.
    if (!filteredItem) {
        // TODO: Render a more user-friendly error component
        return <div>Error: No inventory item specified.</div>;
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inventory', href: route('inventory.index') },
        { title: `${filteredItem.name}`, href: route('inventory.items.batches.index', { item: filteredItem.id }) },
    ];

    const getStatusBadge = (batch: InventoryBatch) => {
        const remaining = parseFloat(batch.remaining_quantity.toString());
        const isExpired = batch.expiration_date && isBefore(new Date(batch.expiration_date), new Date());

        // DEFINITIVE FIX:
        // 1. Explicitly parse the warning days to ensure it's a number, preventing JS type coercion bugs.
        // 2. Use date-fns functions for clear and robust date comparison.
        const warningDays = parseInt(String(filteredItem.days_to_warn_before_expiry), 10);
        const isExpiringSoon =
            batch.expiration_date &&
            !isNaN(warningDays) &&
            isBefore(new Date(batch.expiration_date), addDays(new Date(), warningDays));

        if (remaining <= 0) {
            return <Badge variant="secondary">Empty</Badge>;
        }
        if (isExpired) {
            return <Badge variant="destructive">Expired</Badge>;
        }
        if (isExpiringSoon) {
            return <Badge className="bg-orange-500 text-white hover:bg-orange-600">Expiring Soon</Badge>;
        }
        return <Badge variant="default">Active</Badge>;
    };

    // Calculate total value for a batch (current remaining value)
    const calculateTotalValue = (batch: InventoryBatch) => {
        return (batch.remaining_quantity * (batch.unit_cost ?? 0));
    };

    const pageTitle = `Batches for ${filteredItem.name}`;
    const pageDescription = `A list of all received batches for ${filteredItem.name}.`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <Heading title={pageTitle} description={pageDescription} />

                    {currentBranch && (
                        <Button asChild>
                            <Link
                                href={route('inventory.batches.create', {
                                    item_id: filteredItem.id,
                                    branch_id: currentBranch.id,
                                })}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add New Batch
                            </Link>
                        </Button>
                    )}
                </div>

                <Card>
                    <CardContent className="pt-6">
                        {/* Filter controls */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
                                <Switch
                                    id="show-empty-batches"
                                    checked={showEmptyBatches}
                                    onCheckedChange={setShowEmptyBatches}
                                />
                                <Label htmlFor="show-empty-batches" className="cursor-pointer">
                                    <div className="flex items-center">
                                        <EyeOff className="h-4 w-4 mr-1.5 text-muted-foreground" />
                                        <span>Show Empty Batches</span>
                                    </div>
                                </Label>
                            </div>
                            {!showEmptyBatches && emptyBatchesCount > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    {emptyBatchesCount} empty {emptyBatchesCount === 1 ? 'batch' : 'batches'} hidden
                                </span>
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="rounded-md border hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Batch #</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Received</TableHead>
                                        <TableHead>Expires</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Unit Cost</TableHead>
                                        <TableHead className="text-right">Total Value</TableHead>
                                        <TableHead className="w-[80px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                               <TableBody>
                                    {filteredBatches.length > 0 ? (
                                        filteredBatches.map((batch) => (
                                            <TableRow key={batch.id}>
                                                <TableCell className='font-medium'>#{batch.batch_number}</TableCell>
                                                <TableCell>{getStatusBadge(batch)}</TableCell>
                                                <TableCell>
                                                    {batch.received_at ? (
                                                        format(new Date(batch.received_at), 'PPP')
                                                    ) : (
                                                        <span className="text-muted-foreground">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {batch.expiration_date ? (
                                                        <span
                                                            className={cn(
                                                                new Date(batch.expiration_date) < new Date() &&
                                                                    'text-destructive',
                                                            )}
                                                        >
                                                            {format(new Date(batch.expiration_date), 'PPP')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {batch.remaining_quantity} / {batch.quantity_received}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(batch.unit_cost ?? 0)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(calculateTotalValue(batch))}
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <ChevronDown className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild>
                                                                <Link href={route('inventory.batches.show', batch.id)}>
                                                                    View Details
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={route('inventory.batches.edit', batch.id)}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Edit Batch
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem asChild>
                                                                <Link
                                                                    href={route('inventory.adjustments.create', {
                                                                        batch_id: batch.id,
                                                                        branch_id: batch.branch_id,
                                                                        item_id: batch.inventory_item_id
                                                                    })}
                                                                >
                                                                    <MinusCircle className="mr-2 h-4 w-4" />
                                                                    Record Adjustment
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center h-24">
                                                {showEmptyBatches ? (
                                                    "No batches found."
                                                ) : (
                                                    "No active batches found. Show empty batches to see all."
                                                )}
                                            </TableCell>
                                       </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className='space-y-4 md:hidden'>
                            {filteredBatches.length > 0 ? (
                                filteredBatches.map((batch) => (
                                   <Card key={batch.id} className='p-4'>
                                        <div className='flex justify-between items-start'>
                                            <div>
                                                <p className='font-semibold'>Batch #{batch.batch_number}</p>
                                                <p className='text-sm text-muted-foreground'>
                                                    Received:{' '}
                                                    {batch.received_at ? (
                                                        format(new Date(batch.received_at), 'PPP')
                                                    ) : (
                                                        'N/A'
                                                    )}
                                                </p>
                                            </div>
                                            {getStatusBadge(batch)}
                                        </div>
                                        <div className='mt-4 space-y-2 text-sm'>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Quantity</span>
                                                <span>
                                                    {batch.remaining_quantity} / {batch.quantity_received}{' '}
                                                    {batch.inventory_item.unit}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Unit Cost</span>
                                                <span>{formatCurrency(batch.unit_cost ?? 0)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Total Value</span>
                                                <span className="font-medium">{formatCurrency(calculateTotalValue(batch))}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Expires</span>
                                                <span>
                                                    {batch.expiration_date ? (
                                                        <span
                                                            className={cn(
                                                                new Date(batch.expiration_date) < new Date() &&
                                                                    'text-destructive font-semibold',
                                                            )}
                                                        >
                                                            {format(new Date(batch.expiration_date), 'PPP')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">N/A</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            <Button variant="outline" size="sm" className="w-full" asChild>
                                                <Link href={route('inventory.batches.show', batch.id)}>
                                                    View Details
                                                </Link>
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={route('inventory.batches.edit', batch.id)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit Batch
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={route('inventory.adjustments.create', {
                                                                batch_id: batch.id,
                                                                branch_id: batch.branch_id,
                                                                item_id: batch.inventory_item_id
                                                            })}
                                                        >
                                                            <MinusCircle className="mr-2 h-4 w-4" />
                                                            Record Adjustment
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <div className="text-center text-muted-foreground py-12">
                                    {showEmptyBatches ? (
                                        <p>No batches found.</p>
                                    ) : (
                                        <p>No active batches found. Show empty batches to see all.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                    {batches.meta && batches.meta.last_page > 1 && <Pagination links={batches.meta.links} />}
                </Card>
            </div>
        </AppLayout>
    );
}
