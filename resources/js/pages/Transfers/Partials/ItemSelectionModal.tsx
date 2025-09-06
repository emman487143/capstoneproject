import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CartItem, InventoryBatch, InventoryItem } from '@/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, PackageSearch } from 'lucide-react';

type ModalItem = InventoryBatch & { inventory_item: InventoryItem };

interface Props {
    item: ModalItem | null;
    sourceBranchId: number | string;
    onClose: () => void;
    onAddItem: (item: CartItem) => void;
}

export default function ItemSelectionModal({ item, sourceBranchId, onClose, onAddItem }: Props) {
    const isPortionTracked = item?.inventory_item.tracking_type === 'by_portion';

    return (
        <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add {item?.inventory_item.name} to Transfer</DialogTitle>
                    <DialogDescription>
                        {isPortionTracked
                            ? 'Select the specific portions to transfer.'
                            : 'Specify the quantity from the selected batch to transfer.'}
                    </DialogDescription>
                </DialogHeader>

                {item &&
                    (isPortionTracked ? (
                        // DEFINITIVE FIX: Pass the complete batch item, not just the inventory_item
                        <PortionSelector item={item} onAddItem={onAddItem} onClose={onClose} />
                    ) : (
                        <BatchSelector batch={item} onAddItem={onAddItem} onClose={onClose} />
                    ))}
            </DialogContent>
        </Dialog>
    );
}

function BatchSelector({ batch, onAddItem, onClose }: { batch: ModalItem; onAddItem: (item: CartItem) => void; onClose: () => void }) {
    const { data, setData, errors, processing, setError, clearErrors } = useForm({ quantity: '' });

    const handleAddItem = () => {
        clearErrors();
        const requestedQuantity = parseFloat(data.quantity);

        if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
            setError('quantity', 'Please enter a valid, positive quantity.');
            return;
        }
        if (requestedQuantity > batch.remaining_quantity) {
            setError('quantity', `Cannot add more than the available ${batch.remaining_quantity}.`);
            return;
        }

        onAddItem({
            inventory_item_id: batch.inventory_item_id,
            name: batch.inventory_item.name,
            unit: batch.inventory_item.unit,
            tracking_type: 'by_measure',
            batches: [{
                batch_id: batch.id,
                batch_number: batch.batch_number,
                quantity: requestedQuantity,
                available: batch.remaining_quantity,
            }],
        });
        onClose();
    };

    const handleFormSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        handleAddItem();
    };

    return (
        <form onSubmit={handleFormSubmit} className="space-y-4 py-4">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Batch Number</span>
                <span className="font-mono">#{batch.batch_number}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available Quantity</span>
                <span className="font-semibold">{batch.remaining_quantity} {batch.inventory_item.unit}</span>
            </div>
            <div>
                <Label htmlFor="quantity">Quantity to Transfer</Label>
                <Input id="quantity" type="number" value={data.quantity} onChange={(e) => setData('quantity', e.target.value)} placeholder={`e.g., 5`} autoFocus step="any" min="0.01" max={batch.remaining_quantity} />
                <InputError message={errors.quantity} className="mt-1" />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="button" onClick={handleAddItem} disabled={processing}>Add Item</Button>
            </DialogFooter>
        </form>
    );
}

function PortionSelector({ item, onAddItem, onClose }: { item: ModalItem; onAddItem: (item: CartItem) => void; onClose: () => void }) {
    // DEFINITIVE FIX 2: State is simplified to hold a simple array of portions, not nested batches.
    const [portions, setPortions] = useState<{ id: number; label: string }[]>([]);
    const [selectedPortions, setSelectedPortions] = useState<{ [id: number]: string }>({});
    const [isLoading, setIsLoading] = useState(true);

    // Calculate if all portions are currently selected
    const allSelected = portions.length > 0 && portions.every(portion =>
        selectedPortions[portion.id] !== undefined
    );

    const someSelected = Object.keys(selectedPortions).length > 0;

    useEffect(() => {
        if (item) {
            setIsLoading(true);
            // DEFINITIVE FIX 3: Call the new, correct, and specific API endpoint.
            axios
                .get(route('inventory.batches.available-portions', { batch: item.id }))
                .then((response) => {
                    setPortions(response.data);
                })
                .catch(() => toast.error('Failed to load available portions.'))
                .finally(() => setIsLoading(false));
        }
    }, [item]);

    const handlePortionToggle = (portion: { id: number; label: string }, checked: boolean) => {
        const newSelection = { ...selectedPortions };
        if (checked) {
            newSelection[portion.id] = portion.label;
        } else {
            delete newSelection[portion.id];
        }
        setSelectedPortions(newSelection);
    };

    // New handler for the "Select All" checkbox
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            // Select all portions
            const allPortions: { [id: number]: string } = {};
            portions.forEach(portion => {
                allPortions[portion.id] = portion.label;
            });
            setSelectedPortions(allPortions);
        } else {
            // Deselect all portions
            setSelectedPortions({});
        }
    };

    const handleSubmit = () => {
        const portionIds = Object.keys(selectedPortions).map(Number);
        if (portionIds.length === 0) {
            toast.error('Please select at least one portion to transfer.');
            return;
        }

        const portionLabels = Object.values(selectedPortions);

        onAddItem({
            inventory_item_id: item.inventory_item.id,
            name: item.inventory_item.name,
            unit: item.inventory_item.unit,
            tracking_type: 'by_portion',
            portion_ids: portionIds,
            portion_labels: portionLabels,
            batches: [
                {
                    batch_id: item.id,
                    quantity: portionIds.length,
                    batch_number: item.batch_number,
                    available: item.remaining_quantity,
                },
            ],
        });
        onClose();
    };

    return (
        <div className="space-y-4">
            <ScrollArea className="h-[40vh] border rounded-md p-4">
                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                ) : portions.length > 0 ? (
                    <div>
                        <h4 className="font-semibold mb-2">Available Portions for Batch #{item.batch_number}</h4>

                        {/* Select All Checkbox */}
                        <div className="flex items-center space-x-2 mb-4 p-2 border-b border-dashed">
                            <Checkbox
                                id="select-all-portions"
                                checked={allSelected}
                                onCheckedChange={handleSelectAll}
                                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                            />
                            <label
                                htmlFor="select-all-portions"
                                className="font-medium text-sm cursor-pointer flex items-center justify-between w-full"
                            >
                                <span>Select All Portions</span>
                                {someSelected && (
                                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                                        {Object.keys(selectedPortions).length} of {portions.length}
                                    </span>
                                )}
                            </label>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {portions.map((portion) => (
                                <div
                                    key={portion.id}
                                    className="flex items-center space-x-2 rounded-md border p-2 hover:bg-muted"
                                >
                                    <Checkbox
                                        id={`portion-${portion.id}`}
                                        checked={!!selectedPortions[portion.id]}
                                        onCheckedChange={(checked) => handlePortionToggle(portion, !!checked)}
                                    />
                                    <label
                                        htmlFor={`portion-${portion.id}`}
                                        className="text-sm font-medium leading-none cursor-pointer w-full"
                                    >
                                        {portion.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                        <PackageSearch className="mb-4 h-12 w-12" />
                        <p className="font-semibold">No Available Portions</p>
                        <p className="text-sm">All portions for this batch have been used or are in transit.</p>
                    </div>
                )}
            </ScrollArea>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={Object.keys(selectedPortions).length === 0}
                >
                    Add {Object.keys(selectedPortions).length} Selected Item(s)
                </Button>
            </DialogFooter>
        </div>
    );
}
