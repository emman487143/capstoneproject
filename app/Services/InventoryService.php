<?php

namespace App\Services;

use App\Enums\Inventory\AdjustmentType;
use App\Enums\Inventory\LogAction;
use App\Enums\Inventory\PortionStatus;
use App\Enums\Inventory\TrackingType;
use App\Models\Branch;
use App\Models\InventoryBatch;
use App\Models\InventoryItem;
use App\Models\InventoryLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Throwable;
use App\Models\InventoryBatchPortion;
class InventoryService
{



     /**
     * Creates a new inventory item and syncs its branch associations.
     *
     * @param array<string, mixed> $data
     * @return InventoryItem
     */
    public function createItem(array $data): InventoryItem
    {
        return DB::transaction(function () use ($data) {
            $item = InventoryItem::create([
                'name' => $data['name'],
                'code' => $data['code'],
                'description' => $data['description'],
                'inventory_category_id' => $data['inventory_category_id'],
                'unit' => $data['unit'],
                'tracking_type' => $data['tracking_type'],
                // THIS IS THE FIX: Ensure the new field is saved to the database.
                'days_to_warn_before_expiry' => $data['days_to_warn_before_expiry'],
            ]);

            $this->syncBranches($item, $data['branches']);

            return $item;
        });
    }

    /**
     * Updates an existing inventory item and its branch associations.
     *
     * @param InventoryItem $item
     * @param array<string, mixed> $data
     * @return InventoryItem
     */
    public function updateItem(InventoryItem $item, array $data): InventoryItem
    {
        return DB::transaction(function () use ($item, $data) {
            $item->update([
                'name' => $data['name'],
                'code' => $data['code'],
                'description' => $data['description'],
                'inventory_category_id' => $data['inventory_category_id'],
                'unit' => $data['unit'],
                'tracking_type' => $data['tracking_type'],
                // THIS IS THE FIX: Ensure the new field is updated in the database.
                'days_to_warn_before_expiry' => $data['days_to_warn_before_expiry'],
            ]);

            $this->syncBranches($item, $data['branches']);

            return $item;
        });
    }

    /**
     * Syncs the branches and their specific settings for an inventory item.
     *
     * @param InventoryItem $item
     * @param array<int, array<string, mixed>> $branchesData
     * @return void
     */
    protected function syncBranches(InventoryItem $item, array $branchesData): void
    {
        $syncData = [];
        foreach ($branchesData as $branchData) {
            if ($branchData['is_stocked']) {
                $syncData[$branchData['branch_id']] = [
                    'low_stock_threshold' => $branchData['low_stock_threshold'] ?? 0,
                ];
            }
        }
        $item->branches()->sync($syncData);
    }

    /**
     * Creates a new inventory batch and handles portioning or quantity tracking.
     *
     * @param array<string, mixed> $data
     * @return InventoryBatch
     * @throws Throwable
     */
    public function createBatch(array $data): InventoryBatch
    {
        $inventoryItem = InventoryItem::with('category')->findOrFail($data['inventory_item_id']);

        // Ensure that portion-tracked items have whole number quantities.
       if ($inventoryItem->tracking_type === TrackingType::BY_PORTION && fmod((float)$data['quantity_received'], 1) !== 0.0) {
            throw new InvalidArgumentException('Portion-tracked items must have a whole number quantity.');
        }

       return DB::transaction(function () use ($data, $inventoryItem) {
            $batchNumber = $this->generateNextBatchNumber($inventoryItem->id, $data['branch_id']);

            $batch = InventoryBatch::create([
                'inventory_item_id' => $inventoryItem->id,
                'batch_number' => $batchNumber, // Use auto-generated sequential number
                'branch_id' => $data['branch_id'],
                'received_at' => $data['received_at'] ?? now(),
                'source' => $data['source'] ?? null,
                'quantity_received' => $data['quantity_received'],
                'remaining_quantity' => $data['quantity_received'],
                'unit_cost' => $data['unit_cost'] ?? 0,
                'expiration_date' => $data['expiration_date'] ?? null,
                // REMOVED: notes and manufacturing_date are not needed.
            ]);

       if ($inventoryItem->tracking_type === TrackingType::BY_PORTION) {
                $this->createPortionsForBatch($batch, (int)$data['quantity_received']);
            }

            // UNIFIED LOGGING: A single, clear log entry for any batch creation.
            $logDetails = [
                'quantity_received' => $batch->quantity_received,
                'unit' => $inventoryItem->unit,
            ];

            if ($inventoryItem->tracking_type === TrackingType::BY_PORTION) {
                $logDetails['portions_created'] = (int) $batch->quantity_received;
            }

            InventoryLog::create([
                'inventory_batch_id' => $batch->id,
                'user_id' => auth()->id(),
                'action' => LogAction::BATCH_CREATED,
                'details' => $logDetails,
            ]);

            return $batch;
        });
    }

    /**
     * Generates the next sequential batch number for a given inventory item.
     */
    protected function generateNextBatchNumber(int $inventoryItemId, int $branchId): int
    {
        $latestBatch = InventoryBatch::where('inventory_item_id', $inventoryItemId)
            ->where('branch_id', $branchId) // Scope by branch ID
            ->lockForUpdate() // Prevents race conditions during concurrent requests.
            ->orderBy('batch_number', 'desc')
            ->first();

        return $latestBatch ? $latestBatch->batch_number + 1 : 1;
    }

    /**
     * Creates new portions for a given inventory batch and logs their creation.
     *
     * @param InventoryBatch $batch
     * @param int $quantity
     * @return void
     * @throws Throwable
     */
      public function createPortionsForBatch(InventoryBatch $batch, int $quantity): void
    {
        // This method is self-contained and already wrapped in the parent's transaction.
        $startingPortionNumber = ($batch->portions()->max('portion_number') ?? 0) + 1;
        $portionsToCreate = [];
        $now = now();

        // Eager load relationships needed for label generation to avoid N+1 queries.
        $batch->load(['inventoryItem', 'branch']);

        for ($i = 0; $i < $quantity; $i++) {
            $portionNumber = $startingPortionNumber + $i;
            $label = $this->generatePortionLabel($batch, $portionNumber);

            $portionsToCreate[] = [
                'inventory_batch_id' => $batch->id,
                'current_branch_id' => $batch->branch_id,
                'portion_number' => $portionNumber,
                'label' => $label,
                'status' => PortionStatus::UNUSED->value,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Bulk insert portions for efficiency.
        InventoryBatchPortion::insert($portionsToCreate);

        // Retrieve the newly created portions to get their IDs for logging.
        // $newPortions = InventoryBatchPortion::where('inventory_batch_id', $batch->id)
        //     ->where('portion_number', '>=', $startingPortionNumber)
        //     ->get();

        // $logs = [];
        // foreach ($newPortions as $portion) {
        //     $logs[] = [
        //         'inventory_batch_id' => $batch->id,
        //         'batch_portion_id' => $portion->id,
        //         'user_id' => auth()->id(),
        //         'action' => LogAction::PORTIONS_CREATED->value,
        //         'details' => json_encode(['label' => $portion->label, 'status' => PortionStatus::UNUSED->value]),
        //         'created_at' => $now,
        //         'updated_at' => $now,
        //     ];
        // }

        // Bulk insert logs for efficiency.
        // InventoryLog::insert($logs);
    }
 /**
     * Generates a unique, human-readable label for a portion.
     * Example: PB-CB-B1-01 (Pork Broth, Cabanatuan, Batch 1, Portion 1)
     *
     * @param InventoryBatch $batch
     * @param int $portionNumber
     * @return string
     */
    private function generatePortionLabel(InventoryBatch $batch, int $portionNumber): string
    {
        // Abbreviate Item Name (e.g., "Pork Broth" -> "PB")
        $itemCode = $batch->inventoryItem->code;

        // Use the branch's actual code (e.g., "CB" for Cabanatuan)
        $branchCode = $batch->branch->code;

        // Use the simple, sequential batch number (e.g., 1, 2, 3)
        $batchNumber = $batch->batch_number;

        // Pad the portion number for consistency (e.g., 1 -> 01)
        $portionNumPadded = str_pad((string)$portionNumber, 2, '0', STR_PAD_LEFT);

        return "{$itemCode}-{$branchCode}-B{$batchNumber}-{$portionNumPadded}";
    }

   /**
 * Records an inventory adjustment for a quantity-based item.
 *
 * @param array<string, mixed> $data
 * @param User $user
 * @return void
 * @throws Throwable
 */
public function recordQuantityAdjustment(array $data, User $user): void
{
    DB::transaction(function () use ($data, $user) {
        $batch = InventoryBatch::with('inventoryItem')
            ->lockForUpdate()
            ->findOrFail($data['inventory_batch_id']);

        $quantityToAdjust = (float) $data['quantity'];
        $adjustmentType = AdjustmentType::from($data['type']);
        $isPositive = $adjustmentType->isPositive();

        if ($quantityToAdjust <= 0) {
            throw new InvalidArgumentException('Adjustment quantity must be positive.');
        }

        // For negative adjustments, ensure we have enough quantity
        if (!$isPositive && $quantityToAdjust > $batch->remaining_quantity) {
            throw new InvalidArgumentException('Adjustment quantity cannot exceed the remaining quantity in the batch.');
        }

        $originalQuantity = $batch->remaining_quantity;

        // Apply the adjustment in the appropriate direction
        if ($isPositive) {
            $batch->increment('remaining_quantity', $quantityToAdjust);
        } else {
            $batch->decrement('remaining_quantity', $quantityToAdjust);
        }

        $reason = $data['type'] === AdjustmentType::OTHER->value ? $data['reason'] : $data['type'];
        $logAction = $adjustmentType->toLogAction();

        InventoryLog::create([
            'inventory_batch_id' => $batch->id,
            'user_id' => $user->id,
            'action' => $logAction->value,
            'details' => [
                'quantity_adjusted' => $quantityToAdjust,
                'adjustment_direction' => $isPositive ? 'increase' : 'decrease',
                'original_quantity' => $originalQuantity,
                'new_quantity' => $batch->remaining_quantity,
                'unit' => $batch->inventoryItem->unit,
                'reason' => $reason,
            ],
        ]);
    });
}

/**
 * Records an inventory adjustment for one or more portions.
 *
 * @param array<string, mixed> $data
 * @param User $user
 * @return void
 * @throws Throwable
 */
public function recordPortionAdjustment(array $data, User $user): void
{
    DB::transaction(function () use ($data, $user) {
        $portionIds = $data['portion_ids'];
        $adjustmentType = AdjustmentType::from($data['type']);
        $isPositive = $adjustmentType->isPositive();
        $reason = $data['type'] === AdjustmentType::OTHER->value ? $data['reason'] : $data['type'];

        // For negative adjustments (removing stock)
        if (!$isPositive) {
            // Get unused portions
            $portions = InventoryBatchPortion::with('batch.inventoryItem')
                ->whereIn('id', $portionIds)
                ->where('status', PortionStatus::UNUSED)
                ->lockForUpdate()
                ->get();

            if ($portions->count() !== count($portionIds)) {
                throw new InvalidArgumentException('One or more selected portions are invalid, already used, or do not exist.');
            }

            $logAction = $adjustmentType->toLogAction();
            $newStatus = $adjustmentType->toPortionStatus();

            // Update portion status
            InventoryBatchPortion::whereIn('id', $portionIds)->update([
                'status' => $newStatus->value,
                'updated_at' => now()
            ]);

            // Decrement batch remaining quantity
            $batchCounts = $portions->countBy('inventory_batch_id');
            foreach ($batchCounts as $batchId => $count) {
                InventoryBatch::where('id', $batchId)->decrement('remaining_quantity', $count);
            }

            // Log each adjusted portion
            foreach ($portions as $portion) {
                InventoryLog::create([
                    'inventory_batch_id' => $portion->inventory_batch_id,
                    'batch_portion_id' => $portion->id,
                    'user_id' => $user->id,
                    'action' => $logAction->value,
                    'details' => [
                        'portion_label' => $portion->label,
                        'reason' => $reason,
                        'previous_status' => PortionStatus::UNUSED->value,
                        'new_status' => $newStatus->value,
                    ],
                ]);
            }
        }
        // For positive adjustments (adding stock)
        else {
            // For positive adjustments with portions, we need to create new portions
            $batchId = $data['inventory_batch_id'];
            $batch = InventoryBatch::with('inventoryItem')
                ->lockForUpdate()
                ->findOrFail($batchId);

            // The quantity to add is the number of portions
            $quantityToAdd = count($portionIds); // portionIds contains number of portions to add

            // Create new portions for the batch
            $this->createPortionsForBatch($batch, $quantityToAdd);

            // Log the adjustment
            InventoryLog::create([
                'inventory_batch_id' => $batch->id,
                'user_id' => $user->id,
                'action' => $adjustmentType->toLogAction()->value,
                'details' => [
                    'quantity_added' => $quantityToAdd,
                    'original_quantity' => $batch->remaining_quantity - $quantityToAdd,
                    'new_quantity' => $batch->remaining_quantity,
                    'reason' => $reason,
                ],
            ]);
        }
    });
}
/**
 * Corrects the initial quantity received for a batch.
 *
 * @param InventoryBatch $batch The batch to correct
 * @param float $newQuantity The corrected quantity
 * @param string $reason The reason for the correction
 * @param User $user The user making the correction
 * @return void
 * @throws Throwable
 */
public function correctBatchQuantity(InventoryBatch $batch, float $newQuantity, string $reason, User $user): void
{
    DB::transaction(function () use ($batch, $newQuantity, $reason, $user) {
        $oldQuantity = $batch->quantity_received;
        $quantityDifference = $newQuantity - $oldQuantity;

        // Update the received quantity
        $batch->quantity_received = $newQuantity;

        // Also adjust remaining_quantity proportionally
        if ($batch->remaining_quantity > 0) {
            $batch->remaining_quantity += $quantityDifference;

            // Ensure remaining quantity never goes negative
            if ($batch->remaining_quantity < 0) {
                $batch->remaining_quantity = 0;
            }
        }

        $batch->save();

        // For portion-tracked items, we need to handle portions
        if ($batch->inventoryItem->tracking_type === TrackingType::BY_PORTION) {
            if ($quantityDifference > 0) {
                // Add new portions
                $this->createPortionsForBatch($batch, (int)$quantityDifference);
            } elseif ($quantityDifference < 0) {
                // Remove portions (only unused ones, and only as many as needed)
                $portionsToRemove = (int)abs($quantityDifference);

                $unusedPortions = $batch->portions()
                    ->where('status', PortionStatus::UNUSED)
                    ->orderBy('id', 'desc')
                    ->limit($portionsToRemove)
                    ->get();

                if ($unusedPortions->count() < $portionsToRemove) {
                    throw new InvalidArgumentException(
                        "Cannot decrease quantity by {$portionsToRemove}. Only {$unusedPortions->count()} unused portions available."
                    );
                }

                foreach ($unusedPortions as $portion) {
                    $portion->delete();
                }
            }
        }

        // Create log entry
        InventoryLog::create([
            'inventory_batch_id' => $batch->id,
            'user_id' => $user->id,
            'action' => LogAction::BATCH_COUNT_CORRECTED->value,
            'details' => [
                'old_quantity' => $oldQuantity,
                'new_quantity' => $newQuantity,
                'difference' => $quantityDifference,
                'reason' => $reason,
                'timestamp' => now()->toIso8601String(),
            ],
        ]);
    });
}
/**
 * Restores previously adjusted inventory portions.
 *
 * @param array<int> $portionIds The IDs of portions to restore
 * @param string $reason The reason for restoration
 * @param User $user The user performing the restoration
 * @return void
 * @throws Throwable
 */
public function restorePortions(array $portionIds, string $reason, User $user): void
{
    DB::transaction(function () use ($portionIds, $reason, $user) {
        // Get adjusted portions with their original adjustment logs
        $portions = InventoryBatchPortion::with(['batch', 'logs' => function ($query) {
    $query->whereIn('action', [
        LogAction::ADJUSTMENT_SPOILAGE->value,
        LogAction::ADJUSTMENT_WASTE->value,
        LogAction::ADJUSTMENT_THEFT->value,
        LogAction::ADJUSTMENT_OTHER->value
    ])->latest()->limit(1);
}])
->whereIn('id', $portionIds)
->whereIn('status', [
    PortionStatus::SPOILED->value,
    PortionStatus::WASTED->value,
    PortionStatus::MISSING->value, // Replaced ADJUSTED with MISSING
    PortionStatus::DAMAGED->value  // Added DAMAGED status
])
->lockForUpdate()
->get();

        if ($portions->count() !== count($portionIds)) {
            throw new InvalidArgumentException(
                'One or more selected portions are invalid or cannot be restored.'
            );
        }

        // Group portions by batch for efficient processing
        $portionsByBatch = $portions->groupBy('inventory_batch_id');

        foreach ($portionsByBatch as $batchId => $batchPortions) {
            // Update the batch remaining quantity
            $batch = InventoryBatch::lockForUpdate()->find($batchId);
            $batch->increment('remaining_quantity', $batchPortions->count());

            // Update each portion's status
            foreach ($batchPortions as $portion) {
                // Get the original adjustment log
                $originalLog = $portion->logs->first();
                $originalReason = $originalLog ? ($originalLog->details['reason'] ?? 'Unknown') : 'Unknown';
                $originalAction = $originalLog ? $originalLog->action : null;

                // Update the portion status
                $portion->update([
                    'status' => PortionStatus::UNUSED->value,
                ]);

                // Create restoration log
                InventoryLog::create([
                    'inventory_batch_id' => $batchId,
                    'batch_portion_id' => $portion->id,
                    'user_id' => $user->id,
                    'action' => LogAction::PORTION_RESTORED->value,
                    'details' => [
                        'portion_label' => $portion->label,
                        'restoration_reason' => $reason,
                        'original_adjustment' => [
                            'action' => $originalAction,
                            'reason' => $originalReason,
                            'log_id' => $originalLog ? $originalLog->id : null,
                        ],
                        'previous_status' => $portion->getOriginal('status'),
                    ],
                ]);
            }
        }
    });
}
}
