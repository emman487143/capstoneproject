import { Head, Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { useState } from 'react';
import { Edit, Wrench, MinusCircle, RefreshCw, Printer, ChevronDown } from 'lucide-react'; // Add Printer icon
import { type VariantProps } from 'class-variance-authority';

import { BreadcrumbItem, InventoryBatch, SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CorrectCountModal } from './Partials/CorrectCountModal';
import { RestorePortionModal } from './Partials/RestorePortionModal';
import RestoreQuantityModal from './Partials/RestoreQuantityModal';
import { formatCurrency } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ShowPageProps extends SharedData {
    batch: InventoryBatch;
}

export default function Show({ batch }: ShowPageProps) {
    const [isCorrectCountModalOpen, setIsCorrectCountModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [isRestoreQuantityModalOpen, setIsRestoreQuantityModalOpen] = useState(false);

    // Calculate total value for the batch (current remaining value)
    const calculateTotalValue = (batch: InventoryBatch) => {
        return (batch.remaining_quantity * (batch.unit_cost ?? 0));
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inventory', href: route('inventory.index') },
        {
            title: batch.inventory_item.name,
            href: route('inventory.items.batches.index', { item: batch.inventory_item.id }),
        },
        { title: `Batch #${batch.batch_number}`, href: '#' },
    ];

    const getStatusVariant = (status: string): VariantProps<typeof badgeVariants>['variant'] => {
        switch (status) {
            case 'used':
            case 'spoiled':
            case 'wasted':
                return 'destructive';
            case 'transferred':
            case 'adjusted':
                return 'secondary';
            case 'unused':
            default:
                return 'default';
        }
    };

    // Handler to print all portion labels
    const handlePrintLabels = () => {
        if (!batch.portions || batch.portions.length === 0) return;
        // Open a new window with printable content
        const printWindow = window.open('', '_blank', 'width=600,height=800');
        if (!printWindow) return;
        printWindow.document.write(`
            <html>
            <head>
                <title>Printable Portion Labels - Batch #${batch.batch_number}</title>
                <style>
                    body { font-family: monospace; padding: 24px; }
                    .label-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
                    .portion-label {
                        border: 1px solid #333;
                        border-radius: 6px;
                        padding: 18px 0;
                        text-align: center;
                        font-size: 1.25rem;
                        margin-bottom: 8px;
                        font-weight: bold;
                        letter-spacing: 2px;
                    }
                    .batch-title { font-size: 1.1rem; margin-bottom: 18px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="batch-title">Batch #${batch.batch_number} Portion Labels</div>
                <div class="label-grid">
                    ${batch.portions.map((portion: any) => `
                        <div class="portion-label">${portion.label}</div>
                    `).join('')}
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleRestoreQuantity = () => {
        setIsRestoreQuantityModalOpen(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Batch #${batch.batch_number}`} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Heading
                        title="Batch Details"
                        description={`Viewing batch #${batch.batch_number} of ${batch.inventory_item.name}.`}
                    />
                    <div className="flex items-center gap-2">
                        {/* Consolidated dropdown with all actions */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button>
                                    Manage Batch
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                {/* Primary Action placed first with visual distinction */}
                                <DropdownMenuItem asChild >
                                    <Link
                                        href={route('inventory.adjustments.create', {
                                            item_id: batch.inventory_item.id,
                                            batch_id: batch.id,
                                            branch_id: batch.branch_id,
                                        })}
                                    >
                                        <MinusCircle className="mr-2 h-4 w-4" />
                                        Remove Stock
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                    <Link href={route('inventory.batches.edit', batch.id)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsCorrectCountModalOpen(true)}>
                                    <Wrench className="mr-2 h-4 w-4" />
                                    Correct Count
                                </DropdownMenuItem>

                                {batch.inventory_item.tracking_type === 'by_portion' ? (
                                    <>
                                        <DropdownMenuItem onClick={() => setIsRestoreModalOpen(true)}>
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            Restore Portions
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handlePrintLabels}>
                                            <Printer className="mr-2 h-4 w-4" />
                                            Print Portion Labels
                                        </DropdownMenuItem>
                                    </>
                                ) : (
                                    <>
                                        <DropdownMenuItem onClick={handleRestoreQuantity}>
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            Restore Quantity
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handlePrintLabels}>
                                            <Printer className="mr-2 h-4 w-4" />
                                            Print Batch Label
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Batch Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Item</p>
                            <p className="font-medium">{batch.inventory_item.name}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Branch</p>
                            <p className="font-medium">{batch.branch.name}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Quantity Received</p>
                            <p className="font-medium">{batch.quantity_received}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Remaining Quantity</p>
                            <p className="font-medium">{batch.remaining_quantity}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Received Date</p>
                            <p className="font-medium">
                                {batch.received_at ? format(new Date(batch.received_at), 'PPP') : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Source</p>
                            <p className="font-medium">{batch.source || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Unit Cost</p>
                            <p className="font-medium">
                                {batch.unit_cost ? formatCurrency(batch.unit_cost) : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Total Value</p>
                            <p className="font-medium">
                                {formatCurrency(calculateTotalValue(batch))}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Expiration Date</p>
                            <p className="font-medium">
                                {batch.expiration_date ? format(new Date(batch.expiration_date), 'PPP') : 'N/A'}
                            </p>
                        </div>
                        {batch.inventory_item.tracking_type === 'by_measure' && (
                            <div>
                                <p className="text-muted-foreground">Batch Label</p>
                                <p className="font-mono font-medium">{batch.label || `#${batch.batch_number}`}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {batch.inventory_item.tracking_type === 'by_portion' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Portions ({batch.portions?.length ?? 0})</CardTitle>
                            <CardDescription>Individual trackable units from this batch.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {batch.portions && batch.portions.length > 0 ? (
                                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {batch.portions.map((portion) => (
                                        <li key={portion.id} className="flex justify-between items-center py-3">
                                            <span className="font-mono">{portion.label}</span>
                                            <Badge variant={getStatusVariant(portion.status)}>{portion.status}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                    No portions found for this batch.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Restore Quantity Modal */}
                {isRestoreQuantityModalOpen && (
                    <RestoreQuantityModal
                        open={isRestoreQuantityModalOpen}
                        onOpenChange={setIsRestoreQuantityModalOpen}
                        batchId={batch.id}
                        negativeAdjustments={batch.negative_adjustments || []}
                    />
                )}

                <RestorePortionModal
                    batch={batch}
                    isOpen={isRestoreModalOpen}
                    onClose={() => setIsRestoreModalOpen(false)}
                />

                <CorrectCountModal
                    batch={batch}
                    isOpen={isCorrectCountModalOpen}
                    onClose={() => setIsCorrectCountModalOpen(false)}
                    onSuccess={() => {
                        window.location.reload();
                    }}
                />
            </div>
        </AppLayout>
    );
}
