import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { RefreshCw } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogPortal,
    DialogOverlay,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InventoryBatch } from '@/types';

interface RestorePortionModalProps {
    batch: InventoryBatch;
    isOpen: boolean;
    onClose: () => void;
}

export function RestorePortionModal({ batch, isOpen, onClose }: RestorePortionModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Restore Adjusted Portions</DialogTitle>
                    <DialogDescription>
                        Restore portions that were previously removed from inventory through adjustments.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        Use this feature to restore portions that were incorrectly marked as spoiled, wasted, or otherwise adjusted out of inventory.
                    </p>

                    <p className="text-sm mb-2">
                        You will be able to:
                    </p>

                    <ul className="text-sm list-disc pl-5 space-y-1 mb-4">
                        <li>View a list of all adjusted portions for this batch</li>
                        <li>Select which portions to restore</li>
                        <li>Provide a reason for the restoration</li>
                    </ul>

                    <p className="text-sm font-medium">
                        This action will be logged in the inventory history.
                    </p>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
                    <Button variant="outline" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button asChild>
                        <Link href={route('inventory.batches.portions.restore-form', batch.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Continue to Restore
                        </Link>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
