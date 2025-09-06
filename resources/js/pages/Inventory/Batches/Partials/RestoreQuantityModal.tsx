import { useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { Loader2, MinusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NegativeAdjustment {
    id: number;
    action: string;
    details: {
        quantity_change: number;
        type?: string;
        quantity_adjusted?: number;
        adjustment_direction?: string;
        original_quantity?: string | number;
        new_quantity?: string | number;
    };
    created_at: string;
    user: {
        name: string;
    };
}

interface RestoreQuantityModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    batchId: number;
    negativeAdjustments: NegativeAdjustment[];
}

export default function RestoreQuantityModal({ open, onOpenChange, batchId, negativeAdjustments }: RestoreQuantityModalProps) {
    const [selectedAdjustments, setSelectedAdjustments] = useState<Record<number, number>>({});

    const { data, setData, post, processing, errors, reset, wasSuccessful } = useForm({
        adjustments: {} as Record<number, number>,
        reason: '',
    });

    const getActionLabel = (action: string): string => {
        if (action.startsWith('adjustment_')) {
            return action.replace('adjustment_', '').replace(/_/g, ' ');
        }
        return action.replace(/_/g, ' ');
    };

    const getActionColor = (action: string): string => {
        switch (action) {
            case 'adjustment_spoilage':
                return 'bg-orange-500/10 text-orange-800 border-orange-200';
            case 'adjustment_waste':
                return 'bg-red-500/10 text-red-800 border-red-200';
            case 'adjustment_theft':
                return 'bg-purple-600/10 text-purple-800 border-purple-200';
            case 'adjustment_other':
                return 'bg-gray-500/10 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-500/10 text-gray-800 border-gray-200';
        }
    };

    // Move getQuantityChange function outside handleAdjustmentChange to make it available throughout component
    const getQuantityChange = (adjustment: NegativeAdjustment): number => {
        if (adjustment.details.quantity_change !== undefined) {
            return Math.abs(adjustment.details.quantity_change);
        }

        if (adjustment.details.quantity_adjusted !== undefined) {
            return Math.abs(adjustment.details.quantity_adjusted);
        }

        if (adjustment.details.original_quantity !== undefined &&
            adjustment.details.new_quantity !== undefined) {
            return Math.abs(
                parseFloat(String(adjustment.details.original_quantity)) -
                parseFloat(String(adjustment.details.new_quantity))
            );
        }

        return 0;
    };

    // Update the handleAdjustmentChange function to directly update the form data:
    const handleAdjustmentChange = (id: number, value: string) => {
        const parsedValue = parseFloat(value);
        const adjustment = negativeAdjustments.find(adj => adj.id === id);

        if (isNaN(parsedValue) || parsedValue <= 0 || !adjustment) {
            // Remove from both selectedAdjustments and form data
            const newSelectedAdjustments = { ...selectedAdjustments };
            delete newSelectedAdjustments[id];
            setSelectedAdjustments(newSelectedAdjustments);

            // Also update form data immediately
            const newAdjustments = { ...data.adjustments };
            delete newAdjustments[id];
            setData('adjustments', newAdjustments);
            return;
        }

        // Don't allow restoring more than was deducted
        const maxValue = getQuantityChange(adjustment);
        const validValue = Math.min(parsedValue, maxValue);

        // Update local state for UI rendering
        setSelectedAdjustments({
            ...selectedAdjustments,
            [id]: validValue
        });

        // Also update form data immediately
        setData('adjustments', {
            ...data.adjustments,
            [id]: validValue
        });
    };

    const totalRestoredQuantity = useMemo(() => {
        return Object.values(selectedAdjustments).reduce((sum, value) => sum + value, 0);
    }, [selectedAdjustments]);

    // Then simplify the handleSubmit function to just submit the form:
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (totalRestoredQuantity <= 0) {
            toast.error('Please select at least one adjustment to restore.');
            return;
        }

        // Just post the form - data is already set
        post(route('inventory.batches.restore-quantity', batchId), {
            onSuccess: () => {
                toast.success('Quantity restored successfully.');
                onOpenChange(false);
                reset();
                setSelectedAdjustments({});
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Restore Quantity</DialogTitle>
                    <DialogDescription>
                        Select previously deducted quantities to restore back to inventory.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <ScrollArea className="h-[300px] pr-4">
                        {negativeAdjustments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No negative adjustments found for this batch.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {negativeAdjustments.map((adjustment) => (
                                    <div key={adjustment.id} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <Badge variant="outline" className={cn(getActionColor(adjustment.action))}>
                                                    {getActionLabel(adjustment.action)}
                                                </Badge>
                                                <div className="text-sm mt-1">
                                                    {format(new Date(adjustment.created_at), 'MMM dd, yyyy h:mm a')}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    By {adjustment.user.name}
                                                </div>
                                            </div>
                                            <Badge variant="destructive" className="flex items-center gap-1">
                                                <MinusCircle className="h-3 w-3" />
                                                {getQuantityChange(adjustment)}
                                            </Badge>
                                        </div>

                                        <div className="mt-3">
                                            <Label htmlFor={`adjustment-${adjustment.id}`} className="text-sm">
                                                Quantity to restore (max {getQuantityChange(adjustment)})
                                            </Label>
                                            <Input
                                                id={`adjustment-${adjustment.id}`}
                                                type="number"
                                                min={0}
                                                max={getQuantityChange(adjustment)}
                                                step="0.01"
                                                placeholder="0"
                                                value={selectedAdjustments[adjustment.id] || ''}
                                                onChange={(e) => handleAdjustmentChange(adjustment.id, e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {totalRestoredQuantity > 0 && (
                        <div className="bg-primary-foreground p-3 rounded-md">
                            <div className="font-semibold">Total to restore: {totalRestoredQuantity}</div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for restoration</Label>
                        <Textarea
                            id="reason"
                            placeholder="Please provide a reason for restoring this quantity"
                            value={data.reason}
                            onChange={(e) => setData('reason', e.target.value)}
                            required
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || totalRestoredQuantity <= 0 || !data.reason}
                            className="ml-2"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Restore Quantity'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
