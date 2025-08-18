<?php

namespace App\Http\Controllers\Api;

use App\Enums\Inventory\PortionStatus;
use App\Enums\Inventory\TrackingType;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;

class BranchInventoryController extends Controller
{
    /**
     * Get all inventory items available for transfer from a specific branch.
     * This method prepares a clean, structured payload for the frontend.
     */
    public function forTransfer(Branch $branch): JsonResponse
    {
        // Eager load relationships for performance.
        $items = InventoryItem::with([
            'unit',
            'batches' => function ($query) use ($branch) {
                $query->where('branch_id', $branch->id)
                    // Only include batches that have stock or have usable portions.
                    ->where(function ($q) {
                        $q->where('remaining_quantity', '>', 0)
                            ->orWhereHas('portions', function ($portionQuery) {
                                $portionQuery->where('status', PortionStatus::UNUSED);
                            });
                    })
                    ->with(['portions' => function ($portionQuery) {
                        // Only load the portions that are actually available.
                        $portionQuery->where('status', PortionStatus::UNUSED);
                    }]);
            },
        ])->get();

        // Transform the data into the precise structure the frontend needs.
        $availableItems = $items->map(function ($item) {
            $stock = 0;
            if ($item->tracking_type === TrackingType::BY_PORTION) {
                $stock = $item->batches->sum(fn ($batch) => $batch->portions->count());
            } else {
                $stock = $item->batches->sum('remaining_quantity');
            }

            return [
                'id' => $item->id,
                'name' => $item->name,
                'tracking_type' => $item->tracking_type->value,
                // CORRECTED: Use the nullsafe operator to prevent errors if an item has no unit.
                'unit' => $item->unit?->name ?? '',
                'available_stock' => $stock,
                'batches' => $item->batches->map(function ($batch) {
                    return [
                        'id' => $batch->id,
                        'batch_number' => $batch->batch_number,
                        'expiration_date' => $batch->expiration_date?->toDateString(),
                        'remaining_quantity' => (float) $batch->remaining_quantity,
                        'portions' => $batch->portions->map(fn ($portion) => [
                            'id' => $portion->id,
                            'label' => $portion->label,
                        ]),
                    ];
                })->filter(fn ($batch) => $batch['remaining_quantity'] > 0 || count($batch['portions']) > 0)
                  ->values(),
            ];
        })->filter(fn ($item) => $item['available_stock'] > 0)
          ->sortBy('name')
          ->values();

        return response()->json($availableItems);
    }
}
