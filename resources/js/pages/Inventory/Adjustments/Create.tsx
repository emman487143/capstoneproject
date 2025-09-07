import { Head, useForm, Link } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { LoaderCircle, ChevronRight, X, MinusCircle } from 'lucide-react';

import { AdjustmentType, BreadcrumbItem, InventoryItem as InventoryItemType, SharedData, Branch } from '@/types';
import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// --- Type Definitions ---
interface Portion {
    id: number;
    label: string;
}

interface Batch {
    id: number;
    batch_number: number;
    expiration_date: string | null;
    remaining_quantity: number;
    quantity_received: number;
    portions: Portion[];
    branch_id: number;
}

interface CreateAdjustmentProps extends SharedData {
    branches: Branch[];
    inventoryItems: (InventoryItemType & {
        batches: Batch[];
    })[];
    preselectedItemId?: string | number;
    preselectedBatchId?: string | number;
    preselectedBranchId?: string | number;
}

interface AdjustmentFormData {
    inventory_item_id: string | number;
    branch_id: string | number;
    type: AdjustmentType | '';
    quantity: string;
    inventory_batch_id: string | number;
    portion_ids: number[];
    reason: string;
    [key: string]: any;
}

// --- Component ---
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inventory', href: route('inventory.index') },
    { title: 'Remove Stock', href: route('inventory.adjustments.create') }, // Changed from "Record Adjustment"
];

export default function Create({
    branches,
    inventoryItems,
    preselectedItemId,
    preselectedBatchId,
    preselectedBranchId,
}: CreateAdjustmentProps) {
    const [selectedBatchId, setSelectedBatchId] = useState<string | number>(preselectedBatchId || '');
    // Add state to track selected portion details for the summary
    const [selectedPortionDetails, setSelectedPortionDetails] = useState<Map<number, {
        label: string,
        batchNumber: number,
        batchId: number
    }>>(new Map());

    const { data, setData, post, processing, errors, reset, wasSuccessful } = useForm<AdjustmentFormData>({
        inventory_item_id: preselectedItemId ?? '',
        branch_id: preselectedBranchId ?? '',
        type: '',
        inventory_batch_id: preselectedBatchId ?? '',
        quantity: '',
        portion_ids: [],
        reason: '',
    });

    // --- Derived State & Data ---
    const selectedItem = useMemo(
        () => inventoryItems.find((item) => String(item.id) === String(data.inventory_item_id)) || null,
        [inventoryItems, data.inventory_item_id],
    );

    const availableItems = useMemo(() => {
        if (!data.branch_id) return [];
        return inventoryItems.filter((item) =>
            item.batches.some((batch) => String(batch.branch_id) === String(data.branch_id)),
        );
    }, [inventoryItems, data.branch_id]);

    const getBatchesWithPortions = () => {
        if (!selectedItem) return [];

        // For contextual view (specific batch), only show that batch
        if (preselectedBatchId) {
            return selectedItem.batches.filter(
                (batch) =>
                    String(batch.id) === String(preselectedBatchId) &&
                    batch.portions &&
                    batch.portions.length > 0
            );
        }

        // For global view with batch selected, show only that batch
        if (selectedBatchId) {
            return selectedItem.batches.filter(
                (batch) =>
                    String(batch.id) === String(selectedBatchId) &&
                    batch.portions &&
                    batch.portions.length > 0
            );
        }

        return [];
    };

    const getAvailableBatches = () => {
        if (!selectedItem) return [];
        return selectedItem.batches.filter((batch) => batch.remaining_quantity > 0);
    };

    const getBatchesForQuantity = () => {
        if (!selectedItem) return [];
        if (preselectedBatchId) {
            return selectedItem.batches.filter((batch) => String(batch.id) === String(preselectedBatchId));
        }
        return selectedItem.batches.filter((batch) => batch.remaining_quantity > 0);
    };

    // --- Effects ---
    useEffect(() => {
        if (preselectedItemId) {
            setData('inventory_item_id', String(preselectedItemId));
        }
    }, [preselectedItemId]);

    useEffect(() => {
        if (wasSuccessful) {
            toast.success('Inventory adjustment recorded successfully.');
            if (!preselectedItemId) {
                reset();
            }
        }
    }, [wasSuccessful, preselectedItemId]);

    // --- Event Handlers ---
    const handleItemSelect = (itemId: string) => {
        setData((prev) => ({
            ...prev,
            inventory_item_id: itemId,
            portion_ids: [],
            inventory_batch_id: '',
            quantity: '',
            type: '' // Reset adjustment type when item changes
        }));
        setSelectedBatchId('');
        setSelectedPortionDetails(new Map());
    };

    const handleBatchSelect = (batchId: string) => {
        setSelectedBatchId(batchId);
        setData('inventory_batch_id', batchId);
    };

    const handlePortionSelect = (portionId: number, isChecked: boolean, portionLabel: string, batchNumber: number, batchId: number) => {
        // Update the form data
        const newPortionIds = isChecked
            ? [...data.portion_ids, portionId]
            : data.portion_ids.filter(id => id !== portionId);

        setData('portion_ids', newPortionIds);

        // Update the selected portion details for our summary view
        const newSelectedPortionDetails = new Map(selectedPortionDetails);
        if (isChecked) {
            newSelectedPortionDetails.set(portionId, {
                label: portionLabel,
                batchNumber: batchNumber,
                batchId: batchId
            });
        } else {
            newSelectedPortionDetails.delete(portionId);
        }
        setSelectedPortionDetails(newSelectedPortionDetails);
    };

    // Handle select all portions for a specific batch
    const handleSelectAllPortionsForBatch = (batchId: number, batchNumber: number, isChecked: boolean) => {
        const batch = selectedItem?.batches.find(b => b.id === batchId);
        if (!batch) return;

        // Get current portion IDs
        const currentPortionIds = new Set(data.portion_ids);
        // Create a copy of the current selected portion details
        const newSelectedPortionDetails = new Map(selectedPortionDetails);

        // Update for each portion in the batch
        batch.portions.forEach(portion => {
            if (isChecked) {
                // Add to selected portion IDs if not already there
                currentPortionIds.add(portion.id);
                // Add to selected portion details
                newSelectedPortionDetails.set(portion.id, {
                    label: portion.label,
                    batchNumber: batchNumber,
                    batchId: batchId
                });
            } else {
                // Remove from selected portion IDs
                currentPortionIds.delete(portion.id);
                // Remove from selected portion details
                newSelectedPortionDetails.delete(portion.id);
            }
        });

        // Update state
        setData('portion_ids', Array.from(currentPortionIds));
        setSelectedPortionDetails(newSelectedPortionDetails);
    };

    // Add a helper function to check if all portions of a batch are selected
    const areAllPortionsSelectedForBatch = (batchId: number) => {
        const batch = selectedItem?.batches.find(b => b.id === batchId);
        if (!batch || !batch.portions.length) return false;

        return batch.portions.every(portion => data.portion_ids.includes(portion.id));
    };

    const getBatchesWithSelectedPortions = () => {
        if (!selectedItem) return new Map<number, number>();

        // Create a map of batch IDs to count of selected portions
        const batchCounts = new Map<number, number>();

        // Count selected portions by batch
        Array.from(selectedPortionDetails.values()).forEach(detail => {
            const currentCount = batchCounts.get(detail.batchId) || 0;
            batchCounts.set(detail.batchId, currentCount + 1);
        });

        return batchCounts;
    };

    // Remove a selected portion
    const removeSelectedPortion = (portionId: number) => {
        const newPortionIds = data.portion_ids.filter(id => id !== portionId);
        setData('portion_ids', newPortionIds);

        const newSelectedPortionDetails = new Map(selectedPortionDetails);
        newSelectedPortionDetails.delete(portionId);
        setSelectedPortionDetails(newSelectedPortionDetails);
    };

    // Return to the batch selection view
    const backToBatchSelection = () => {
        setSelectedBatchId('');
    };

    // Navigate to a specific batch for editing its selections
    const goToBatch = (batchId: number) => {
        setSelectedBatchId(batchId);
    };

    // Group selected portions by batch for the summary view
    const getGroupedSelections = () => {
        const grouped = new Map<number, { batchNumber: number, portions: { id: number, label: string }[] }>();

        Array.from(selectedPortionDetails.entries()).forEach(([portionId, detail]) => {
            if (!grouped.has(detail.batchId)) {
                grouped.set(detail.batchId, {
                    batchNumber: detail.batchNumber,
                    portions: []
                });
            }
            grouped.get(detail.batchId)?.portions.push({
                id: portionId,
                label: detail.label
            });
        });

        return Array.from(grouped.entries()).map(([batchId, data]) => ({
            batchId,
            batchNumber: data.batchNumber,
            portions: data.portions
        }));
    };

    const isFormValid = () => {
        if (!data.inventory_item_id || !data.type) return false;
        if (data.type === 'Other' && !data.reason) return false;
        if (data.type === 'Missing' && !data.reason) return false;

        if (selectedItem?.tracking_type === 'by_portion') {
            if (data.portion_ids.length === 0) return false;
        } else if (selectedItem?.tracking_type === 'by_measure') {
            if (!data.inventory_batch_id || !data.quantity || parseFloat(data.quantity) <= 0) {
                return false;
            }
        }

        return true;
    };

    const submit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();

        post(route('inventory.adjustments.store'), {
            preserveScroll: true,
            onError: (errors) => {
                console.error('Adjustment submission failed:', errors);
                toast.error('Failed to record adjustment. Please check the form for errors.');
            }
        });
    };

    // --- Safe format function to handle null dates ---
    const formatDate = (date: string | null, formatString: string): string => {
        if (!date) return 'N/A';
        return format(new Date(date), formatString);
    };

    // --- Render ---
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Remove Stock" /> {/* Changed from "Record Adjustment" */}
            <div className="p-4 sm:p-6 lg:p-8">
                <form onSubmit={submit} className="max-w-2xl mx-auto space-y-6">
                    <Heading
                        title="Remove Stock" /* Changed from "Record Adjustment" */
                        description="Remove inventory items due to spoilage, waste, theft, or other reasons."
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>Stock Removal Details</CardTitle> {/* Changed from "Adjustment Details" */}
                            <CardDescription>Select the item and specify why stock needs to be removed.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Branch and Item selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="branch_id">Branch</Label>
                                    <Select
                                        name="branch_id"
                                        value={String(data.branch_id)}
                                        onValueChange={(value) => setData('branch_id', value)}
                                        disabled={processing || !!preselectedBranchId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a branch..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.id} value={String(branch.id)}>
                                                    {branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.branch_id} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="inventory_item_id">Inventory Item</Label>
                                    <Select
                                        name="inventory_item_id"
                                        value={String(data.inventory_item_id)}
                                        onValueChange={handleItemSelect}
                                        disabled={processing || !data.branch_id || !!preselectedItemId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an item..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableItems.map((item) => (
                                                <SelectItem key={item.id} value={String(item.id)}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.inventory_item_id} />
                                </div>
                            </div>

                            {/* Adjustment Type - Only negative adjustments */}
                            {selectedItem && (
                                <div className="space-y-2">
                                    <Label htmlFor="adjustment_type">Adjustment Type</Label>
                                    <Select
                                        name="type"
                                        value={data.type}
                                        onValueChange={(value) => {
                                            const adjustmentType = value as AdjustmentType;
                                            setData(prev => ({
                                                ...prev,
                                                type: adjustmentType,
                                                // Reset related fields when changing adjustment type
                                                portion_ids: [],
                                                quantity: '',
                                            }));
                                            setSelectedPortionDetails(new Map());
                                            setSelectedBatchId('');
                                        }}
                                        disabled={processing}
                                    >
                                        <SelectTrigger className="border-destructive">
                                            <SelectValue placeholder="Select adjustment type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>

                                                <SelectItem value="Spoilage">Spoilage</SelectItem>
                                                <SelectItem value="Waste">Waste</SelectItem>
                                                <SelectItem value="Theft">Theft</SelectItem>
                                                <SelectItem value="Damaged">Damaged</SelectItem>
                                                <SelectItem value="Missing">Missing</SelectItem>
                                                <SelectItem value="Expired">Expired</SelectItem>
                                                <SelectItem value="Staff Meal">Staff Meal</SelectItem>
                                            </SelectGroup>
                                            <SelectSeparator />
                                            <SelectItem value="Other">Other (Specify Reason)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.type} />
                                </div>
                            )}

                            {/* Info banner for "Other" adjustment type */}
                            {selectedItem && data.type === 'Other' && (
                                <div className="space-y-2 rounded-md border p-4 bg-muted/10">
                                    <div className="flex items-center">
                                        <MinusCircle className="h-5 w-5 text-destructive mr-2" />
                                        <Label className="text-base">Remove Stock</Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        This adjustment will remove stock. Please specify the reason below.
                                    </p>
                                </div>
                            )}

                            {/* Conditional reason field for types that require reason */}
                            {(data.type === 'Other' || data.type === 'Missing') && (
                                <div className="space-y-2">
                                    <Label htmlFor="reason">Reason</Label>
                                    <Textarea
                                        id="reason"
                                        value={data.reason}
                                        onChange={(e) => setData('reason', e.target.value)}
                                        placeholder="Please provide a specific reason for the adjustment."
                                        disabled={processing}
                                    />
                                    <InputError message={errors.reason} />
                                </div>
                            )}

                            {/* Conditional UI based on item type */}
                            {selectedItem && data.type && (
                                <>
                                    {/* For portion-based items */}
                                    {selectedItem.tracking_type === 'by_portion' && (
                                        <div className="space-y-4">
                                            {/* Batch selection step for global view */}
                                            {!preselectedBatchId && !selectedBatchId && (
                                                <div className="space-y-2">
                                                    <Label>Select a Batch</Label>
                                                    <div className="space-y-2 max-h-72 overflow-y-auto">
                                                        {getAvailableBatches().map((batch) => {
                                                            // Get count of selected portions for this batch
                                                            const batchCounts = getBatchesWithSelectedPortions();
                                                            const selectedCount = batchCounts.get(batch.id) || 0;

                                                            return (
                                                                <Card
                                                                    key={batch.id}
                                                                    className={`p-4 hover:bg-accent/50 cursor-pointer ${
                                                                        selectedCount > 0 ? 'border-primary/50' : ''
                                                                    }`}
                                                                    onClick={() => handleBatchSelect(String(batch.id))}
                                                                >
                                                                    <div className="flex justify-between items-center">
                                                                        <div>
                                                                            <span className="font-medium">Batch #{batch.batch_number}</span>
                                                                            <div className="text-sm text-muted-foreground">
                                                                                {batch.portions.length} portions available
                                                                                {selectedCount > 0 && (
                                                                                    <span className="ml-2 text-primary">
                                                                                        ({selectedCount} selected)
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center">
                                                                            <Badge variant="outline" className="mr-2">
                                                                                {batch.remaining_quantity}/{batch.quantity_received} remaining
                                                                            </Badge>
                                                                            <ChevronRight className="h-4 w-4" />
                                                                        </div>
                                                                    </div>
                                                                    {batch.expiration_date && (
                                                                        <div className="text-xs text-muted-foreground mt-1">
                                                                            Expires: {formatDate(batch.expiration_date, 'PPP')}
                                                                        </div>
                                                                    )}
                                                                </Card>
                                                            );
                                                        })}
                                                        {getAvailableBatches().length === 0 && (
                                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                                No batches available for this item.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Show portions for selected batch */}
                                            {(selectedBatchId || preselectedBatchId) && (
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <Label>Select Portions</Label>
                                                        {!preselectedBatchId && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={backToBatchSelection}
                                                            >
                                                                Back to Batch List
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="space-y-4 max-h-72 overflow-y-auto rounded-md border p-4">
                                                        {getBatchesWithPortions().length > 0 ? (
                                                            getBatchesWithPortions().map((batch) => (
                                                                <div key={batch.id}>
                                                                    <div className="flex justify-between items-center mb-2 border-b pb-2">
                                                                        <h4 className="font-semibold text-sm">
                                                                            Batch #{batch.batch_number}
                                                                            <span className="text-muted-foreground font-normal ml-2">
                                                                                (Expires: {formatDate(batch.expiration_date, 'PPP')})
                                                                            </span>
                                                                        </h4>
                                                                        {/* Add Select All checkbox */}
                                                                        <div className="flex items-center space-x-2">
                                                                            <Checkbox
                                                                                id={`select-all-batch-${batch.id}`}
                                                                                checked={areAllPortionsSelectedForBatch(batch.id)}
                                                                                onCheckedChange={(checked) =>
                                                                                    handleSelectAllPortionsForBatch(
                                                                                        batch.id,
                                                                                        batch.batch_number,
                                                                                        !!checked
                                                                                    )
                                                                                }
                                                                            />
                                                                            <label
                                                                                htmlFor={`select-all-batch-${batch.id}`}
                                                                                className="text-xs font-medium cursor-pointer"
                                                                            >
                                                                                Select All ({batch.portions.length})
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                                        {batch.portions.map((portion) => (
                                                                            <div
                                                                                key={portion.id}
                                                                                className="flex items-center space-x-2"
                                                                            >
                                                                                <Checkbox
                                                                                    id={`portion-${portion.id}`}
                                                                                    checked={data.portion_ids.includes(
                                                                                        portion.id,
                                                                                    )}
                                                                                    onCheckedChange={(checked) =>
                                                                                        handlePortionSelect(
                                                                                            portion.id,
                                                                                            !!checked,
                                                                                            portion.label,
                                                                                            batch.batch_number,
                                                                                            batch.id
                                                                                        )
                                                                                    }
                                                                                />
                                                                                <label
                                                                                    htmlFor={`portion-${portion.id}`}
                                                                                    className="text-sm font-mono leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                                                >
                                                                                    {portion.label}
                                                                                </label>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                                No available portions for this batch.
                                                            </p>
                                                        )}
                                                    </div>
                                                    <InputError message={errors.portion_ids} />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* For measure-based items */}
                                    {selectedItem.tracking_type === 'by_measure' && (
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="inventory_batch_id">Select Batch</Label>
                                                {preselectedBatchId && getBatchesForQuantity().length > 0 ? (
                                                    <div className="p-4 border rounded-md bg-accent/10">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <span className="font-medium">Batch #{getBatchesForQuantity()[0].batch_number}</span>
                                                                <div className="text-sm text-muted-foreground mt-1">
                                                                    {getBatchesForQuantity()[0].expiration_date ? (
                                                                        <span>Expires: {formatDate(getBatchesForQuantity()[0].expiration_date, 'PPP')}</span>
                                                                    ) : (
                                                                        <span>No expiration date</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline">
                                                                {getBatchesForQuantity()[0].remaining_quantity}/{getBatchesForQuantity()[0].quantity_received} {selectedItem.unit} remaining
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Select
                                                        name="inventory_batch_id"
                                                        value={String(data.inventory_batch_id)}
                                                        onValueChange={(value) => setData('inventory_batch_id', value)}
                                                        disabled={processing}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a batch..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {getBatchesForQuantity().map((batch) => (
                                                                <SelectItem key={batch.id} value={String(batch.id)}>
                                                                    Batch #{batch.batch_number} ({batch.remaining_quantity}/{batch.quantity_received} {selectedItem.unit})
                                                                    {batch.expiration_date && ` • Expires: ${formatDate(batch.expiration_date, 'MMM d, yyyy')}`}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                <InputError message={errors.inventory_batch_id} />
                                            </div>

                                            {data.inventory_batch_id && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="quantity">
                                                        Quantity to Remove ({selectedItem.unit})
                                                    </Label>
                                                    <Input
                                                        id="quantity"
                                                        type="number"
                                                        value={data.quantity}
                                                        onChange={(e) => setData('quantity', e.target.value)}
                                                        placeholder={`e.g., 1.5 (${selectedItem.unit})`}
                                                        disabled={processing}
                                                        step="0.01"
                                                        min="0.01"
                                                        max={data.inventory_batch_id
                                                            ? getBatchesForQuantity().find(b => String(b.id) === String(data.inventory_batch_id))?.remaining_quantity
                                                            : undefined
                                                        }
                                                    />
                                                    <InputError message={errors.quantity} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-end">
                            <Button type="submit" disabled={processing || !isFormValid()}>
                                {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                Remove Stock {/* Changed from "Record Adjustment" */}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Selected Portions Summary - appears below the portion selection */}
                    {selectedPortionDetails.size > 0 && (
                        <div className="space-y-2 mt-6 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Selected Portions ({selectedPortionDetails.size})</Label>
                            </div>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="space-y-6">
                                        {getGroupedSelections().map(group => (
                                            <div key={group.batchId} className="space-y-3">
                                                <div className="flex justify-between items-center border-b pb-2">
                                                    <h4 className="font-medium text-sm">
                                                        Batch #{group.batchNumber}
                                                        <span className="ml-2 text-muted-foreground">
                                                            ({group.portions.length} portions)
                                                        </span>
                                                    </h4>
                                                    {!preselectedBatchId && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => goToBatch(group.batchId)}
                                                        >
                                                            Edit
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* Responsive grid for portion badges */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                                    {group.portions.map(portion => (
                                                        <Badge
                                                            key={portion.id}
                                                            variant="secondary"
                                                            className="flex items-center justify-between gap-1 h-7 max-w-full"
                                                        >
                                                            <span className="font-mono truncate text-xs">{portion.label}</span>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-4 w-4 p-0 hover:bg-transparent shrink-0"
                                                                onClick={() => removeSelectedPortion(portion.id)}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </form>
            </div>
        </AppLayout>
    );
}
