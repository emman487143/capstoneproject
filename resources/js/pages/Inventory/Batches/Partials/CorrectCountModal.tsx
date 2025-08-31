import { FormEventHandler } from 'react';
import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LoaderCircle } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { InventoryBatch } from '@/types';

interface CorrectCountModalProps {
    batch: InventoryBatch;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function CorrectCountModal({ batch, isOpen, onClose, onSuccess }: CorrectCountModalProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        corrected_quantity: batch.quantity_received.toString(),
        reason: '',
    });

    // Calculate the difference for the user to visualize
    const originalQuantity = parseFloat(batch.quantity_received.toString());
    const newQuantity = parseFloat(data.corrected_quantity);
    const difference = newQuantity - originalQuantity;

    const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        post(route('inventory.batches.correct-count', batch.id), {
            onSuccess: () => {
                onSuccess?.();
                onClose();
                reset();
                toast.success('Batch count successfully corrected');
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Correct Initial Count</DialogTitle>
                    <DialogDescription>
                        Adjust the initially received quantity for Batch #{batch.batch_number}.
                        This is an administrative action that will be logged.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Original Quantity</Label>
                            <Input
                                value={originalQuantity.toString()}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="corrected_quantity">Corrected Quantity</Label>
                            <Input
                                id="corrected_quantity"
                                value={data.corrected_quantity}
                                onChange={e => setData('corrected_quantity', e.target.value)}
                                type="number"
                                step={batch.inventory_item.tracking_type === 'by_portion' ? '1' : '0.01'}
                                min="0"
                                required
                            />

                            <InputError message={errors.corrected_quantity} />
                        </div>
                    </div>

                    {/* Show adjustment impact */}
                    {!isNaN(difference) && (
                        <div className="rounded-md p-3 mt-2 bg-muted">
                            <span className="text-sm font-medium">
                                Adjustment:
                                <span className={cn(
                                    difference > 0 ? "text-green-600" :
                                    difference < 0 ? "text-destructive" : ""
                                )}>
                                    {' '}{difference > 0 ? '+' : ''}{difference.toFixed(
                                        batch.inventory_item.tracking_type === 'by_portion' ? 0 : 2
                                    )}
                                </span>
                            </span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Correction</Label>
                        <Textarea
                            id="reason"
                            value={data.reason}
                            onChange={e => setData('reason', e.target.value)}
                            placeholder="Please provide a detailed explanation for this correction"
                            required
                            className="min-h-24"
                        />
                        <InputError message={errors.reason} />
                    </div>

                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing || isNaN(newQuantity)}>
                            {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Correction
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
