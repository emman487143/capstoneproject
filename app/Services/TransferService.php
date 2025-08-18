<?php

namespace App\Services;

use App\Enums\Inventory\LogAction;
use App\Enums\Inventory\PortionStatus;
use App\Enums\Inventory\TrackingType;
use App\Enums\Transfers\TransferItemStatus;
use App\Enums\Transfers\TransferStatus;
use App\Models\InventoryBatch;
use App\Models\InventoryBatchPortion;
use App\Models\InventoryItem;
use App\Models\InventoryLog;
use App\Models\Transfer;
use App\Models\TransferItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class TransferService
{
    /**
     * Initiates a transfer, validates stock, deducts inventory, and creates all necessary records.
     * This entire process is wrapped in a database transaction to ensure atomicity.
     *
     * @throws Throwable
     * @throws ValidationException
     */
    public function initiateTransfer(array $validatedData, User $sendingUser): Transfer
    {
        return DB::transaction(function () use ($validatedData, $sendingUser) {
            // Step 1: Create the main Transfer record.
            $transfer = Transfer::create([
                'source_branch_id' => $validatedData['source_branch_id'],
                'destination_branch_id' => $validatedData['destination_branch_id'],
                'sending_user_id' => $sendingUser->id,
                'notes' => $validatedData['notes'] ?? null,
                'status' => TransferStatus::PENDING,
                'sent_at' => now(),
            ]);

            // Step 2: Process each item in the transfer.
            foreach ($validatedData['items'] as $itemData) {
                $item = InventoryItem::findOrFail($itemData['inventory_item_id']);

                if ($itemData['tracking_type'] === TrackingType::BY_MEASURE->value) {
                    foreach ($itemData['batches'] as $batchData) {
                        $this->processBatchDeductionForTransfer($transfer, $item, $batchData);
                    }
                } elseif ($itemData['tracking_type'] === TrackingType::BY_PORTION->value) {
                    $this->processPortionDeductionForTransfer($transfer, $item, $itemData);
                }
            }

            return $transfer;
        });
    }

    /**
     * Deducts a specific quantity from a single batch for a transfer.
     */
    private function processBatchDeductionForTransfer(Transfer $transfer, InventoryItem $item, array $batchData): void
    {
        $batch = InventoryBatch::lockForUpdate()->find($batchData['batch_id']);
        $quantityToDeduct = (float) $batchData['quantity'];

        if ($batch->remaining_quantity < $quantityToDeduct) {
            throw ValidationException::withMessages([
                'items' => "Concurrency Error: Insufficient stock for Batch #{$batch->batch_number} of {$item->name}. Please try again.",
            ]);
        }

        $batch->decrement('remaining_quantity', $quantityToDeduct);

        $transfer->items()->create([
            'inventory_item_id' => $item->id,
            'inventory_batch_id' => $batch->id,
            'quantity' => $quantityToDeduct,
        ]);

        InventoryLog::create([
            'inventory_batch_id' => $batch->id,
            'user_id' => $transfer->sending_user_id,
            'action' => LogAction::TRANSFER_INITIATED,
            'details' => [
                'quantity_change' => -$quantityToDeduct,
                'destination_branch' => $transfer->destinationBranch->name,
                'transfer_id' => $transfer->id,
            ],
        ]);
    }

    /**
     * Marks specific portions as 'in_transit' for a transfer.
     */
    private function processPortionDeductionForTransfer(Transfer $transfer, InventoryItem $item, array $itemData): void
    {
        $portionIds = $itemData['portion_ids'];

        $portions = InventoryBatchPortion::with('batch')
            ->whereIn('id', $portionIds)
            ->where('status', PortionStatus::UNUSED)
            ->whereHas('batch', function ($query) use ($item) {
                $query->where('inventory_item_id', $item->id);
            })
            ->lockForUpdate()
            ->get();

        if ($portions->count() !== count($portionIds)) {
            throw ValidationException::withMessages([
                'items' => "One or more portions for {$item->name} are unavailable, do not exist, or do not belong to the correct item.",
            ]);
        }

       foreach ($portions as $portion) {
            $transfer->items()->create([
                'inventory_item_id' => $item->id,
                'inventory_batch_id' => $portion->inventory_batch_id,
                'inventory_batch_portion_id' => $portion->id,
                'quantity' => 1,
            ]);

            $portion->update(['status' => PortionStatus::IN_TRANSIT->value]);
$portion->batch->decrement('remaining_quantity');
            InventoryLog::create([
                'inventory_batch_id' => $portion->inventory_batch_id,
                'batch_portion_id' => $portion->id,
                'user_id' => $transfer->sending_user_id,
                'action' => LogAction::TRANSFER_INITIATED,
                'details' => [
                    'quantity_change' => -1,
                    'destination_branch' => $transfer->destinationBranch->name,
                    'transfer_id' => $transfer->id,
                ],
            ]);
        }
    }

    /**
     * Processes the reception of a transfer, updating all related inventory and logging all actions.
     */
   public function receiveTransfer(Transfer $transfer, array $receptionData, User $receivingUser): Transfer
    {
        return DB::transaction(function () use ($transfer, $receptionData, $receivingUser) {
            $transfer->update([
                'status' => TransferStatus::COMPLETED,
                'receiving_user_id' => $receivingUser->id,
                'received_at' => now(),
            ]);

            // CORRECTED: Group received items by their original source batch ID before creating new inventory.
            // This is the critical fix to prevent creating a separate new batch for each individual portion.
            $receivedItemsBySourceBatch = [];

            foreach ($receptionData['items'] as $itemData) {
                $transferItem = TransferItem::find($itemData['id']);
                if (!$transferItem) {
                    continue;
                }

                $transferItem->update([
                    'reception_status' => $itemData['reception_status'],
                    'received_quantity' => $itemData['received_quantity'] ?? 0,
                    'reception_notes' => $itemData['reception_notes'] ?? null,
                ]);

                // Handle portion-based items (already working)
                if ($transferItem->inventory_batch_portion_id) {
                    $this->finalizeOriginalPortionStatus($transfer, $transferItem, $itemData, $receivingUser);
                }
                // Add new code to handle by_measure rejected items
                else if ($itemData['reception_status'] === TransferItemStatus::REJECTED->value) {
                    // Get the original batch and return inventory to source branch
                    $originalBatch = InventoryBatch::lockForUpdate()->find($transferItem->inventory_batch_id);
                    if ($originalBatch) {
                        $originalBatch->increment('remaining_quantity', $transferItem->quantity);

                        // Log the rejection properly
                        InventoryLog::create([
                            'inventory_batch_id' => $transferItem->inventory_batch_id,
                            'user_id' => $receivingUser->id,
                            'action' => LogAction::TRANSFER_REJECTED,
                            'details' => [
                                'quantity_change' => $transferItem->quantity,
                                'notes' => $transferItem->reception_notes ?? 'Item rejected during transfer reception',
                                'transfer_id' => $transfer->id,
                            ],
                        ]);
                    }

                    // Skip further processing for rejected items
                    continue;
                }

                $receivedQuantity = (float) ($itemData['received_quantity'] ?? 0);

                // If the item was received, add it to our grouping array.
                if ($receivedQuantity > 0) {
                    $sourceBatchId = $transferItem->inventory_batch_id;
                    if (!isset($receivedItemsBySourceBatch[$sourceBatchId])) {
                        $receivedItemsBySourceBatch[$sourceBatchId] = [
                            'items' => [],
                            'total_quantity' => 0,
                        ];
                    }
                    $receivedItemsBySourceBatch[$sourceBatchId]['items'][] = $transferItem;
                    $receivedItemsBySourceBatch[$sourceBatchId]['total_quantity'] += $receivedQuantity;
                }

                $discrepancy = $transferItem->quantity - $receivedQuantity;
                if ($discrepancy > 0) {
                    $this->logReceptionDiscrepancy($transfer, $transferItem, $discrepancy, $receivingUser);
                }
            }

            // Now, iterate over the groups and create ONE new batch per source batch.
            foreach ($receivedItemsBySourceBatch as $group) {
                $firstItem = $group['items'][0];
                $totalQuantity = $group['total_quantity'];
                $this->createReceivedInventory($transfer, $firstItem, $totalQuantity, $receivingUser);
            }

            return $transfer;
        });
    }

    /**
     * Updates the status of the original portion at the source branch based on reception status.
     */
    private function finalizeOriginalPortionStatus(Transfer $transfer, TransferItem $transferItem, array $itemData, User $receivingUser): void
{
    $originalPortion = InventoryBatchPortion::with('batch')->find($transferItem->inventory_batch_portion_id);
    if (!$originalPortion) {
        return;
    }
    $receptionStatus = TransferItemStatus::tryFrom($itemData['reception_status']);

    if ($receptionStatus === TransferItemStatus::RECEIVED || $receptionStatus === TransferItemStatus::RECEIVED_WITH_ISSUES) {
        $originalPortion->update([
            'status' => PortionStatus::TRANSFERRED,
            'consumed_at' => now(),
        ]);
    }  elseif ($receptionStatus === TransferItemStatus::REJECTED) {
        $originalPortion->update(['status' => PortionStatus::UNUSED]);
        // CRITICAL FIX: Increment the parent batch's quantity as the portion is returned to stock.
        $originalPortion->batch->increment('remaining_quantity');

        // FIXED: Use consistent TRANSFER_REJECTED action instead of TRANSFER_CANCELLED
        InventoryLog::create([
            'inventory_batch_id' => $originalPortion->inventory_batch_id,
            'batch_portion_id' => $originalPortion->id,
            'user_id' => $receivingUser->id,
            'action' => LogAction::TRANSFER_REJECTED, // Changed from TRANSFER_CANCELLED
            'details' => [
                'quantity_change' => 1,
                'notes' => "Portion returned to stock after rejection in Transfer #{$transfer->id}",
                'transfer_id' => $transfer->id,
            ],
        ]);
    }
}

    /**
     * Creates a new inventory batch at the destination, delegating to InventoryService to handle portions correctly.
     */
    private function createReceivedInventory(Transfer $transfer, TransferItem $transferItem, float $receivedQuantity, User $receivingUser): void
    {
        $originalBatch = $transferItem->inventoryBatch;
        $inventoryService = app(InventoryService::class);

        $newBatch = $inventoryService->createBatch([
            'inventory_item_id' => $transferItem->inventory_item_id,
            'branch_id' => $transfer->destination_branch_id,
            'quantity_received' => $receivedQuantity,
            'unit_cost' => $originalBatch->unit_cost,
            'expiration_date' => $originalBatch->expiration_date,
            'source' => "From Transfer #{$transfer->id} (Original Batch: #{$originalBatch->batch_number} @ {$transfer->sourceBranch->name})",
        ]);

        InventoryLog::create([
            'inventory_batch_id' => $newBatch->id,
            'user_id' => $receivingUser->id,
            'action' => LogAction::TRANSFER_RECEIVED,
            'details' => [
                'quantity_change' => $receivedQuantity,
                'source_branch' => $transfer->sourceBranch->name,
                'transfer_id' => $transfer->id,
                'original_source_batch_id' => $originalBatch->id,
                'original_source_batch_number' => $originalBatch->batch_number,
                'notes' => "Stock received and re-batched as #{$newBatch->batch_number} at destination.",
            ],
        ]);
    }

    /**
     * Logs inventory adjustments for discrepancies found during reception.
     */
    private function logReceptionDiscrepancy(Transfer $transfer, TransferItem $transferItem, float $discrepancy, User $receivingUser): void
    {
        InventoryLog::create([
            'inventory_batch_id' => $transferItem->inventory_batch_id,
            'user_id' => $receivingUser->id,
            'action' => LogAction::TRANSFER_CANCELLED,
            'details' => [
                'quantity_change' => -$discrepancy,
                'notes' => $transferItem->reception_notes ?? 'Item missing or damaged during transfer.',
                'transfer_id' => $transfer->id,
            ],
        ]);
    }

    /**
     * Cancels a pending transfer, returning all deducted stock to the source branch.
     *
     * @throws Throwable
     */
    public function cancelTransfer(Transfer $transfer, User $cancellingUser): Transfer
    {
        if (!$transfer->status->isPending()) {
            throw ValidationException::withMessages([
                'transfer' => 'This transfer cannot be cancelled as it is already completed or cancelled.',
            ]);
        }
 return DB::transaction(function () use ($transfer, $cancellingUser) {
            foreach ($transfer->items as $transferItem) {
                $logDetails = [
                    'transfer_id' => $transfer->id,
                ];

                if ($transferItem->inventory_batch_portion_id) {
                    // Eager load the batch relationship.
                    $portion = InventoryBatchPortion::with('batch')->lockForUpdate()->find($transferItem->inventory_batch_portion_id);
                    if ($portion && $portion->status === PortionStatus::IN_TRANSIT->value) {
                        $portion->update(['status' => PortionStatus::UNUSED]);
                        // CRITICAL FIX: Increment the parent batch's quantity upon cancellation.
                        $portion->batch->increment('remaining_quantity');
                        $logDetails['quantity_change'] = 1;
                        $logDetails['batch_portion_id'] = $portion->id;
                    }
                } else {
                    $batch = InventoryBatch::lockForUpdate()->find($transferItem->inventory_batch_id);
                    if ($batch) {
                        $batch->increment('remaining_quantity', $transferItem->quantity);
                        $logDetails['quantity_change'] = (float) $transferItem->quantity;
                    }
                }

                InventoryLog::create([
                    'inventory_batch_id' => $transferItem->inventory_batch_id,
                    'user_id' => $cancellingUser->id,
                    'action' => LogAction::TRANSFER_CANCELLED,
                    'details' => $logDetails,
                ]);
            }

            $transfer->update([
                'status' => TransferStatus::CANCELLED,
                'receiving_user_id' => $cancellingUser->id,
                'received_at' => now(),
            ]);

            return $transfer;
        });
    }

    /**
 * Rejects a pending transfer, returning all stock to the source branch.
 * Similar to cancellation, but tracks it as a rejection for business analytics.
 *
 * @throws Throwable
 */
public function rejectTransfer(Transfer $transfer, User $rejectingUser, string $rejectionReason = null): Transfer
{
    if (!$transfer->status->isPending()) {
        throw ValidationException::withMessages([
            'transfer' => 'This transfer cannot be rejected as it is already processed.',
        ]);
    }

    return DB::transaction(function () use ($transfer, $rejectingUser, $rejectionReason) {
        foreach ($transfer->items as $transferItem) {
            $logDetails = [
                'transfer_id' => $transfer->id,
                'notes' => $rejectionReason ?? 'Transfer rejected',
            ];

            if ($transferItem->inventory_batch_portion_id) {
                // First lock the batch to prevent concurrent operations
                $batch = InventoryBatch::lockForUpdate()->find($transferItem->inventory_batch_id);
                if (!$batch) continue;

                // Then get the portion with batch relationship
                $portion = InventoryBatchPortion::with('batch')
                    ->where('id', $transferItem->inventory_batch_portion_id)
                    ->where('status', PortionStatus::IN_TRANSIT->value)
                    ->first();

                if ($portion) {
                    $portion->update(['status' => PortionStatus::UNUSED]);
                    $batch->increment('remaining_quantity', 1);
                    $logDetails['quantity_change'] = 1;
                    $logDetails['batch_portion_id'] = $portion->id;
                }
            } else {
                $batch = InventoryBatch::lockForUpdate()->find($transferItem->inventory_batch_id);
                if ($batch) {
                    $batch->increment('remaining_quantity', $transferItem->quantity);
                    $logDetails['quantity_change'] = (float) $transferItem->quantity;
                }
            }

            InventoryLog::create([
                'inventory_batch_id' => $transferItem->inventory_batch_id,
                'user_id' => $rejectingUser->id,
                'action' => LogAction::TRANSFER_REJECTED,
                'details' => $logDetails,
            ]);
        }

        // Update transfer status to REJECTED
        $transfer->update([
            'status' => TransferStatus::REJECTED,
            'receiving_user_id' => $rejectingUser->id,
            'received_at' => now(),
            'notes' => $transfer->notes . "\n\nRejection reason: " . $rejectionReason,
        ]);

        return $transfer;
    });
}
}
