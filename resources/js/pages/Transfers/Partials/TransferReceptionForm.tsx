import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Transfer } from '@/types';
import { Auth } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, ChevronDown, ChevronUp, LoaderCircle } from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
    isOpen: boolean;
    onClose: () => void;
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
    unit: string; // Store as string for UI display
    batch_number: string;
    product_id: number;
};

type GroupedItems = {
    [key: string]: {
        items: ReceptionItemData[];
        name: string;
        totalSent: number;
        unit: string;
        batch_number: string;
    }
};

type ReceptionFormData = {
    items: ReceptionItemData[];
    reject_all?: boolean;
    rejection_reason?: string;
};

interface ReceptionFormErrors {
    [key: string]: unknown; // Use 'unknown' as the base type for the index signature
    items?: {
        [index: number]: {
            reception_status?: string;
            received_quantity?: string;
            reception_notes?: string;
        };
    };
}

const statusOptions: { value: string; label: string }[] = [
    { value: 'received', label: '✅ Received in Full' },
    { value: 'received_with_issues', label: '⚠️ Received with Issues' },
    { value: 'rejected', label: '❌ Rejected' },
];

export default function TransferReceptionForm({ isOpen, onClose, transfer }: Props) {
    // Track open state for each group
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [showRejectAll, setShowRejectAll] = useState(false);

    // Get formatted data from transfer items
    const formattedItems = useMemo(() => {
        return transfer.items.map((item) => ({
            id: item.id,
            reception_status: 'received',
            received_quantity: item.quantity,
            reception_notes: '',
            name: item.inventory_item.name,
            sent_quantity: item.quantity,
            unit: typeof item.inventory_item.unit === 'string'
                ? item.inventory_item.unit
                : item.inventory_item.unit.name,
            batch_number: item.inventory_batch.batch_number.toString(),
            product_id: item.inventory_item.id,
        }));
    }, [transfer.items]);

    // Convert transfer items to our format with batch info
    const { data, setData, post, put, processing, errors, reset } = useForm<ReceptionFormData>({
    items: formattedItems,
    reject_all: false,
    rejection_reason: '',
});

    // Helper function to safely get nested error messages
    const getNestedError = (path: string): string | undefined => {
        return path.split('.').reduce((acc: any, part) => acc?.[part], errors as any);
    };

    // Group items by product and batch for more efficient UI
    const groupedItems = useMemo(() => {
        const groups: GroupedItems = {};

        data.items.forEach(item => {
            // Create a key that combines product name and batch number
            const groupKey = `${item.product_id}-${item.batch_number}`;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    items: [],
                    name: item.name,
                    totalSent: 0,
                    unit: item.unit,
                    batch_number: item.batch_number
                };
            }

            groups[groupKey].items.push(item);
            groups[groupKey].totalSent += item.sent_quantity;
        });

        return groups;
    }, [data.items]);

    // Reset form when dialog opens
    useEffect(() => {
        if (isOpen) {
            // Reset form to default state
            setData({
                items: formattedItems,
                reject_all: false,
                rejection_reason: '',
            });

            setShowRejectAll(false);

            // Default all groups to be open
            const initialOpenState: Record<string, boolean> = {};
            Object.keys(groupedItems).forEach(key => {
                initialOpenState[key] = true;
            });
            setOpenGroups(initialOpenState);
        }
    }, [isOpen, transfer.items, formattedItems]);

    // Toggle group open/closed state
    const toggleGroup = (groupKey: string) => {
        setOpenGroups(prev => ({
            ...prev,
            [groupKey]: !prev[groupKey]
        }));
    };

    // Handle all items in a group changing status
    const handleGroupStatusChange = (groupKey: string, newStatus: string) => {
        const groupItems = groupedItems[groupKey].items;
        const itemIds = groupItems.map(item => item.id);

        setData('items', data.items.map(item => {
            if (itemIds.includes(item.id)) {
                let receivedQty = item.received_quantity;

                if (newStatus === 'received') {
                    receivedQty = item.sent_quantity;
                } else if (newStatus === 'rejected') {
                    receivedQty = 0;
                }

                return { ...item, reception_status: newStatus, received_quantity: receivedQty };
            }
            return item;
        }));
    };

    // Original handlers for individual items
    const handleStatusChange = (itemId: number, newStatus: string) => {
        setData(
            'items',
            data.items.map((item) => {
                if (item.id !== itemId) return item;

                const sentQuantity = transfer.items.find((i) => i.id === itemId)?.quantity ?? 0;
                let received_quantity = item.received_quantity;

                if (newStatus === 'received') {
                    received_quantity = sentQuantity;
                } else if (newStatus === 'rejected') {
                    received_quantity = 0;
                }

                return { ...item, reception_status: newStatus, received_quantity };
            }),
        );
    };

    const handleQuantityChange = (itemId: number, newQuantity: string) => {
        setData(
            'items',
            data.items.map((item) => (item.id === itemId ? { ...item, received_quantity: parseFloat(newQuantity) || 0 } : item)),
        );
    };

    const handleNotesChange = (itemId: number, newNotes: string) => {
        setData(
            'items',
            data.items.map((item) => (item.id === itemId ? { ...item, reception_notes: newNotes } : item)),
        );
    };

    // Add a group note handler
    const handleGroupNotesChange = (groupKey: string, notes: string) => {
        const groupItems = groupedItems[groupKey].items;
        const itemIds = groupItems.map(item => item.id);

        setData('items', data.items.map(item => {
            if (itemIds.includes(item.id)) {
                return { ...item, reception_notes: notes };
            }
            return item;
        }));
    };

  const handleRejectAll = () => {
    // The form data already contains rejection_reason
    post(route('inventory.transfers.reject', transfer.id), {
        onSuccess: () => {
            toast.success(`Transfer #${transfer.id} rejected successfully.`);
            onClose();
        },
        onError: () => {
            toast.error('An error occurred while rejecting the transfer.');
        }
    });
};


// Also update the second instance in handleSubmit
const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();

    // Define allRejected inside this function
    const allRejected = data.items.every(item => item.reception_status === 'rejected');

    if (allRejected && !data.reject_all) {
        setShowRejectAll(true);
        return;
    }

    // If all items are rejected and user has confirmed, use reject endpoint
    if (allRejected && data.reject_all) {
        post(route('inventory.transfers.reject', transfer.id), {
            onSuccess: () => {
                toast.success(`Transfer #${transfer.id} rejected successfully.`);
                onClose();
            },
            onError: () => {
                toast.error('An error occurred while rejecting the transfer.');
            }
        });
        return;
    }

    // Use PUT for normal reception with mixed statuses
    put(route('inventory.transfers.update', transfer.id), {
        onSuccess: () => {
            toast.success(`Transfer #${transfer.id} received successfully.`);
            onClose();
        },
        onError: () => {
            toast.error('An error occurred. Please review the form and try again.');
        }
    });
};

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Receive Transfer #{transfer.id}</DialogTitle>
                    <DialogDescription>Verify each item received from the source branch. Any discrepancies will be logged.</DialogDescription>
                </DialogHeader>

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
                                onClick={() => setShowRejectAll(false)}
                                disabled={processing}
                            >
                                Back to Review
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleRejectAll}
                                disabled={processing || !data.rejection_reason}
                            >
                                Confirm Rejection
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <ScrollArea className="h-[60vh] p-1">
                            <div className="space-y-6 p-4">
                                {/* Group items by product and batch */}
                                {Object.entries(groupedItems).map(([groupKey, group]) => (
                                    <Card key={groupKey} className="overflow-hidden">
                                        <Collapsible open={openGroups[groupKey]} onOpenChange={() => toggleGroup(groupKey)}>
                                            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent" onClick={() => toggleGroup(groupKey)}>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold">{group.name}</h3>
                                                        <Badge variant="outline">Batch #{group.batch_number}</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {group.totalSent} {group.unit} · {group.items.length} {group.items.length > 1 ? 'items' : 'item'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center">
                                                    <Select
                                                        defaultValue="received"
                                                        onValueChange={(value) => handleGroupStatusChange(groupKey, value)}
                                                    >
                                                        <SelectTrigger className="w-[180px] mr-2">
                                                            <SelectValue placeholder="Set all status" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {statusOptions.map((option) => (
                                                                <SelectItem key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <CollapsibleTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            {openGroups[groupKey] ? (
                                                                <ChevronUp className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </CollapsibleTrigger>
                                                </div>
                                            </div>

                                            <CollapsibleContent>
                                                <CardContent className="pt-0 pb-4">
                                                    {/* Group notes field */}
                                                    <div className="mb-4 pb-4 border-b">
                                                        <Label htmlFor={`group-notes-${groupKey}`}>Notes for all items in this group</Label>
                                                        <Textarea
                                                            id={`group-notes-${groupKey}`}
                                                            placeholder="Add notes that apply to all items in this group..."
                                                            onChange={(e) => handleGroupNotesChange(groupKey, e.target.value)}
                                                            disabled={processing}
                                                            className="mt-1"
                                                        />
                                                    </div>

                                                    {/* Only show individual items if there's more than one or if expanded view is requested */}
                                                    {group.items.length > 1 && (
                                                        <div className="space-y-4 mt-4">
                                                            <h4 className="text-sm font-medium text-muted-foreground">Individual Items</h4>
                                                            {group.items.map((item, index) => {
                                                                const itemIndex = data.items.findIndex(i => i.id === item.id);
                                                                const errorPath = `items.${itemIndex}`;

                                                                return (
                                                                    <div key={item.id} className="grid grid-cols-1 gap-4 p-3 rounded-md bg-accent/20 md:grid-cols-3">
                                                                        <div>
                                                                            <Label htmlFor={`status-${item.id}`}>Status</Label>
                                                                            <Select
                                                                                value={item.reception_status}
                                                                                onValueChange={(value) => handleStatusChange(item.id, value)}
                                                                                disabled={processing}
                                                                            >
                                                                                <SelectTrigger id={`status-${item.id}`}>
                                                                                    <SelectValue placeholder="Select status..." />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {statusOptions.map((opt) => (
                                                                                        <SelectItem key={opt.value} value={opt.value}>
                                                                                            {opt.label}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <InputError message={getNestedError(`${errorPath}.reception_status`)} className="mt-1" />
                                                                        </div>
                                                                        <div>
                                                                            <Label htmlFor={`quantity-${item.id}`}>Quantity Received</Label>
                                                                            <Input
                                                                                id={`quantity-${item.id}`}
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={item.received_quantity}
                                                                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                                                disabled={processing || item.reception_status === 'rejected'}
                                                                                max={item.sent_quantity}
                                                                                min={0}
                                                                            />
                                                                            <InputError message={getNestedError(`${errorPath}.received_quantity`)} className="mt-1" />
                                                                        </div>
                                                                        <div>
                                                                            <Label htmlFor={`notes-${item.id}`}>Individual Notes</Label>
                                                                            <Input
                                                                                id={`notes-${item.id}`}
                                                                                value={item.reception_notes}
                                                                                onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                                                                disabled={processing}
                                                                                placeholder="Specific notes for this item"
                                                                            />
                                                                            <InputError message={getNestedError(`${errorPath}.reception_notes`)} className="mt-1" />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    {group.items.length === 1 && (
                                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                            <div>
                                                                <Label htmlFor={`status-${group.items[0].id}`}>Status</Label>
                                                                <Select
                                                                    value={group.items[0].reception_status}
                                                                    onValueChange={(value) => handleStatusChange(group.items[0].id, value)}
                                                                    disabled={processing}
                                                                >
                                                                    <SelectTrigger id={`status-${group.items[0].id}`}>
                                                                        <SelectValue placeholder="Select status..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {statusOptions.map((opt) => (
                                                                            <SelectItem key={opt.value} value={opt.value}>
                                                                                {opt.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label htmlFor={`quantity-${group.items[0].id}`}>Quantity Received</Label>
                                                                <Input
                                                                    id={`quantity-${group.items[0].id}`}
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={group.items[0].received_quantity}
                                                                    onChange={(e) => handleQuantityChange(group.items[0].id, e.target.value)}
                                                                    disabled={processing || group.items[0].reception_status === 'rejected'}
                                                                    max={group.items[0].sent_quantity}
                                                                    min={0}
                                                                />
                                                                {/* Use the helper function for the single item case as well */}
                                                                <InputError
                                                                    message={getNestedError(`items.${data.items.findIndex(i => i.id === group.items[0].id)}.received_quantity`)}
                                                                    className="mt-1"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                        <DialogFooter className="pt-6">
                            <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                type="button"
                                onClick={() => setShowRejectAll(true)}
                                disabled={processing}
                                className="mr-2"
                            >
                                Reject All
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Reception
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
