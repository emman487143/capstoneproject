import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Transfer } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, ChevronDown, ChevronUp, LoaderCircle, X, Check, PackageCheck } from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface Props {
    transfer: Transfer;
}

type ReceptionItemData = {
    id: number;
    reception_status: string;
    received_quantity: number;
    reception_notes: string;
    // Display properties
    name: string;
    sent_quantity: number;
    unit: string;
    batch_number: string;
    product_id: number;
    // Track if item is checked in checklist
    checked: boolean;
};

type ReceptionFormData = {
    items: ReceptionItemData[];
    reject_all?: boolean;
    rejection_reason?: string;
};

export default function TransferReceptionForm({ transfer }: Props) {
    const [showRejectAll, setShowRejectAll] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

    // Get formatted data from transfer items with added "checked" property
    const formattedItems = useMemo(() => {
        return transfer.items.map((item) => ({
            id: item.id,
            reception_status: 'received', // Default status
            received_quantity: item.quantity,
            reception_notes: '',
            name: item.inventory_item.name,
            sent_quantity: item.quantity,
            unit: typeof item.inventory_item.unit === 'string'
                ? item.inventory_item.unit
                : item.inventory_item.unit.name,
            batch_number: item.inventory_batch.batch_number.toString(),
            product_id: item.inventory_item.id,
            checked: true, // Default to checked (received)
        }));
    }, [transfer.items]);

    const { data, setData, post, put, processing, errors, reset } = useForm<ReceptionFormData>({
        items: formattedItems,
        reject_all: false,
        rejection_reason: '',
    });

    // Helper function to safely get nested error messages
    const getNestedError = (path: string): string | undefined => {
        return path.split('.').reduce((acc: any, part) => acc?.[part], errors as any);
    };

    // Group items by product type for the UI
    const groupedItems = useMemo(() => {
        const groups: { [key: string]: ReceptionItemData[] } = {};

        data.items.forEach(item => {
            if (!groups[item.product_id]) {
                groups[item.product_id] = [];
            }
            groups[item.product_id].push(item);
        });

        return groups;
    }, [data.items]);

    // Toggle item expanded state
    const toggleItemExpanded = (itemId: number) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // Handle checkbox change
    const handleItemCheck = (itemId: number, checked: boolean) => {
        setData('items', data.items.map(item => {
            if (item.id === itemId) {
                const newStatus = checked ? 'received' : 'rejected';
                const newQuantity = checked ? item.sent_quantity : 0;

                return {
                    ...item,
                    checked,
                    reception_status: newStatus,
                    received_quantity: newQuantity
                };
            }
            return item;
        }));
    };

    // Handle "Check All" functionality
    const handleCheckAll = (checked: boolean) => {
        setData('items', data.items.map(item => ({
            ...item,
            checked,
            reception_status: checked ? 'received' : 'rejected',
            received_quantity: checked ? item.sent_quantity : 0
        })));
    };

    // Calculate if all items are checked
    const allChecked = data.items.every(item => item.checked);
    const someChecked = data.items.some(item => item.checked);
    const noneChecked = data.items.every(item => !item.checked);

    // Handle quantity change
    const handleQuantityChange = (itemId: number, newQuantity: string) => {
        setData('items', data.items.map(item => {
            if (item.id === itemId) {
                const parsedQuantity = parseFloat(newQuantity) || 0;
                // If quantity is 0, mark as rejected
                const newStatus = parsedQuantity > 0 ? 'received' : 'rejected';
                const newChecked = parsedQuantity > 0;

                return {
                    ...item,
                    received_quantity: parsedQuantity,
                    reception_status: newStatus,
                    checked: newChecked
                };
            }
            return item;
        }));
    };

    // Handle notes change
    const handleNotesChange = (itemId: number, newNotes: string) => {
        setData('items', data.items.map(item => (
            item.id === itemId ? { ...item, reception_notes: newNotes } : item
        )));
    };

    // Handle reject all
    const handleRejectAll = () => {
        post(route('inventory.transfers.reject', transfer.id), {
            onSuccess: () => {
                toast.success(`Transfer #${transfer.id} rejected successfully.`);
            },
            onError: () => {
                toast.error('An error occurred while rejecting the transfer.');
            }
        });
    };

    // Form submission
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        // If all items are unchecked, show reject all form
        if (noneChecked && !data.reject_all) {
            setShowRejectAll(true);
            return;
        }

        // If reject all is confirmed
        if (noneChecked && data.reject_all) {
            post(route('inventory.transfers.reject', transfer.id), {
                onSuccess: () => {
                    toast.success(`Transfer #${transfer.id} rejected successfully.`);
                },
                onError: () => {
                    toast.error('An error occurred while rejecting the transfer.');
                }
            });
            return;
        }

        // Normal reception with mixed statuses
        put(route('inventory.transfers.update', transfer.id), {
            onSuccess: () => {
                toast.success(`Transfer #${transfer.id} received successfully.`);
            },
            onError: () => {
                toast.error('An error occurred. Please review the form and try again.');
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pb-24 relative">
            {showRejectAll ? (
                <div className="space-y-4">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>You're rejecting this entire transfer</AlertTitle>
                        <AlertDescription>
                            This will mark all items as rejected and notify the source branch.
                        </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                        <Label htmlFor="rejection-reason">Rejection Reason</Label>
                        <Textarea
                            id="rejection-reason"
                            value={data.rejection_reason || ''}
                            onChange={(e) => setData('rejection_reason', e.target.value)}
                            placeholder="Please provide a reason for rejecting this transfer..."
                            rows={3}
                            className="resize-none"
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => setShowRejectAll(false)}
                            disabled={processing}
                        >
                            Back to Review
                        </Button>
                        <Button
                            variant="destructive"
                            type="button"
                            onClick={handleRejectAll}
                            disabled={processing || !data.rejection_reason}
                        >
                            Confirm Rejection
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <Card>
                        <CardHeader className="border-b pb-3">
                            <div className="flex flex-row justify-between items-center">
                                <CardTitle className="flex items-center gap-2">
                                    <PackageCheck className="h-5 w-5" />
                                    Receive Items
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="select-all"
                                        checked={allChecked}
                                        onCheckedChange={handleCheckAll}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                    <label
                                        htmlFor="select-all"
                                        className="text-sm font-medium cursor-pointer select-none"
                                    >
                                        Select All Items
                                    </label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 pb-2">
                            {/* Non-scrollable, full-length checklist */}
                            <div className="space-y-4">
                                {Object.entries(groupedItems).map(([productId, items]) => (
                                    <div key={productId} className="space-y-2">
                                        <h3 className="text-sm font-medium text-muted-foreground px-1">
                                            {items[0].name}
                                        </h3>

                                        {items.map((item) => {
                                            const itemIndex = data.items.findIndex(i => i.id === item.id);
                                            const errorPath = `items.${itemIndex}`;
                                            const transferItem = transfer.items.find(ti => ti.id === item.id);
                                            const portion = transferItem?.inventory_batch_portion;
                                            const isByPortion = !!portion;
                                            const isExpanded = !!expandedItems[item.id];

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={cn(
                                                        "border rounded-lg overflow-hidden transition-colors",
                                                        item.checked ? "bg-white" : "bg-gray-50 border-dashed"
                                                    )}
                                                >
                                                    <div className="flex items-center px-4 py-3">
                                                        <Checkbox
                                                            id={`item-${item.id}`}
                                                            checked={item.checked}
                                                            onCheckedChange={(checked) =>
                                                                handleItemCheck(item.id, !!checked)
                                                            }
                                                            className="mr-3 data-[state=checked]:bg-primary h-5 w-5"
                                                        />

                                                        <div className="flex-grow min-w-0" onClick={() => toggleItemExpanded(item.id)}>
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-sm">
                                                                            Batch #{item.batch_number}
                                                                        </span>
                                                                        {isByPortion && (
                                                                            <Badge variant="outline" className="font-mono text-xs">
                                                                                {portion.label}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {item.sent_quantity} {item.unit}
                                                                    </span>
                                                                </div>

                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleItemExpanded(item.id);
                                                                    }}
                                                                    className="ml-2"
                                                                >
                                                                    {isExpanded ? (
                                                                        <ChevronUp className="h-4 w-4" />
                                                                    ) : (
                                                                        <ChevronDown className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="px-4 pb-4 pt-1 border-t bg-muted/30">
                                                            {!isByPortion && (
                                                                <div className="mb-3">
                                                                    <Label htmlFor={`quantity-${item.id}`} className="text-xs">
                                                                        Quantity Received
                                                                    </Label>
                                                                    <div className="flex items-center">
                                                                        <Input
                                                                            id={`quantity-${item.id}`}
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={item.received_quantity}
                                                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                                            disabled={processing || !item.checked}
                                                                            max={item.sent_quantity}
                                                                            min="0"
                                                                            className="max-w-[120px]"
                                                                        />
                                                                        <span className="ml-2 text-sm">{item.unit}</span>
                                                                    </div>
                                                                    <InputError message={getNestedError(`${errorPath}.received_quantity`)} className="mt-1" />
                                                                </div>
                                                            )}

                                                            <div>
                                                                <Label htmlFor={`notes-${item.id}`} className="text-xs">Notes</Label>
                                                                <Input
                                                                    id={`notes-${item.id}`}
                                                                    value={item.reception_notes}
                                                                    onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                                                    disabled={processing}
                                                                    placeholder={item.checked ? "Any notes about this item?" : "Reason for rejection"}
                                                                />
                                                                <InputError message={getNestedError(`${errorPath}.reception_notes`)} className="mt-1" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 border-t pt-4">
                            <Button
                                variant="destructive"
                                type="button"
                                onClick={() => setShowRejectAll(true)}
                                disabled={processing}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Reject All
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                            >
                                {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                {someChecked ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Confirm Reception
                                    </>
                                ) : (
                                    <>
                                        <X className="mr-2 h-4 w-4" />
                                        Reject All Items
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </>
            )}
        </form>
    );
}
