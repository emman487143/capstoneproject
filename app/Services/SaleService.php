<?php

namespace App\Services;

use App\Enums\Inventory\LogAction;
use App\Enums\Inventory\PortionStatus;
use App\Enums\Inventory\TrackingType;
use App\Enums\SaleStatus;
use App\Models\InventoryBatch;
use App\Models\InventoryBatchPortion;
use App\Models\InventoryItem;
use App\Models\InventoryLog;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;
use Illuminate\Support\Facades\Log;
class SaleService
{
    /**
     * Create a new sale and deduct inventory within a database transaction.
     *
     * @param array $validatedData The validated data from StoreSaleRequest.
     * @param int $userId The ID of the user performing the sale.
     * @return Sale The created sale model.
     * @throws ValidationException|Throwable
     */
    public function createSale(array $validatedData, int $userId): Sale
    {
        return DB::transaction(function () use ($validatedData, $userId) {
            $branchId = $validatedData['branch_id'];
            $saleItemsData = $validatedData['items'];

            // 1. Aggregate all required ingredients and quantities for the entire order.
            $requiredIngredients = $this->getRequiredIngredients($saleItemsData);

            // 2. Perform a locking stock check and get the batches needed for deduction.
            $batchesToDeductFrom = $this->checkStockAndGetBatches($requiredIngredients, $branchId);

            // 3. Create the Sale record.
            $sale = Sale::create([
                'branch_id' => $branchId,
                'user_id' => $userId,
                'status' => SaleStatus::COMPLETED,
                'notes' => $validatedData['notes'] ?? null,
                'total_amount' => 0, // Will be calculated next.
            ]);

             // 4. Create SaleItems, deduct from batches, log, and calculate total amount.
            $totalAmount = $this->processSaleItemsAndDeductions($sale, $saleItemsData, $batchesToDeductFrom, $requiredIngredients);

            // 5. Update the sale with the final calculated total.
            $sale->update(['total_amount' => $totalAmount]);

            return $sale;
        });
    }

    /**
     * Aggregates all required ingredients from the list of products being sold.
     */
 private function getRequiredIngredients(array $saleItemsData): array
    {
        $required = [];
        $productIds = array_column($saleItemsData, 'product_id');
        // Eager load ingredients for all products in the sale for efficiency.
        $products = Product::with('ingredients')->findMany($productIds)->keyBy('id');

        foreach ($saleItemsData as $item) {
            if (! $product = $products->get($item['product_id'])) {
                continue; // Failsafe if a product isn't found
            }

            foreach ($product->ingredients as $ingredient) {
                // CRITICAL FIX: Access the ingredient's ID directly from the related model.
                $itemId = $ingredient->id;
                // CRITICAL FIX: Access the recipe quantity from the 'pivot' attribute.
                $quantityForOneProduct = $ingredient->pivot->quantity_required;

                $quantityNeeded = $item['quantity'] * $quantityForOneProduct;

                // Correctly aggregate the total quantity needed for each ingredient ID.
                $required[$itemId] = ($required[$itemId] ?? 0) + $quantityNeeded;
            }
        }

        return $required;
    }
    /**
     * Checks stock using a pessimistic lock and returns the batches to deduct from.
     * @throws ValidationException
     */
  private function checkStockAndGetBatches(array $requiredIngredients, int $branchId): array
    {
        $deductionData = [];
        $inventoryItems = InventoryItem::find(array_keys($requiredIngredients));
        $stockErrors = []; // Initialize an array to collect all stock errors.

foreach ($requiredIngredients as $itemId => $quantityNeeded) {
            $item = $inventoryItems->find($itemId);
            $query = InventoryBatch::query()
                ->where('inventory_item_id', $itemId)
                ->where('branch_id', $branchId)
                ->where('remaining_quantity', '>', 0)
                // MODIFICATION: Replace the simple FIFO ordering with the intelligent FEFO/FIFO hybrid logic.
                // This prioritizes expiring items first (FEFO) and uses the oldest stock for non-perishables (FIFO).
                ->orderByRaw('expiration_date IS NULL, expiration_date ASC, created_at ASC');

            if ($item->tracking_type === \App\Enums\Inventory\TrackingType::BY_PORTION) {
                $query->with(['portions' => fn ($q) => $q->where('status', \App\Enums\Inventory\PortionStatus::UNUSED)->orderBy('portion_number')]);
            }

            // Lock the batches for this specific item to prevent race conditions.
            $batches = $query->lockForUpdate()->get();
            $currentStock = $batches->sum('remaining_quantity');

            if ($currentStock < $quantityNeeded) {
                // Add a detailed error message for each insufficient item instead of throwing immediately.
                $itemName = $item->name ?? "Item ID {$itemId}";
                $stockErrors[] = "{$itemName} (Required: {$quantityNeeded}, Available: {$currentStock})";
            } else {
                // Only prepare deduction data if stock is sufficient.
                $deductionData[$itemId] = [
                    'item' => $item,
                    'batches' => $batches,
                    'portions' => $item->tracking_type === \App\Enums\Inventory\TrackingType::BY_PORTION
                        ? $batches->flatMap->portions
                        : collect(),
                ];
            }
        }

        // After checking all items, if any errors were found, throw a single, consolidated exception.
        if (!empty($stockErrors)) {
            $errorMessage = 'Insufficient stock for: ' . implode('; ', $stockErrors) . '.';
            throw ValidationException::withMessages([
                'items' => $errorMessage,
            ]);
        }

        return $deductionData;
    }
    /**
     * Creates SaleItem records, deducts from batches, creates logs, and calculates the total sale amount.
     */
  private function processSaleItemsAndDeductions(Sale $sale, array $saleItemsData, array $deductionData, array $requiredIngredients): float
    {
        $totalAmount = 0;
        $logsToInsert = [];
        $now = now();
        $deductedQuantities = [];

        // PERFORMANCE REFACTOR: Eager load all products involved in the sale once to prevent N+1 queries.
        $productIds = array_column($saleItemsData, 'product_id');
        $products = Product::findMany($productIds)->keyBy('id');

        // First, create all sale item records and calculate the total sale amount.
        foreach ($saleItemsData as $itemData) {
            // PERFORMANCE REFACTOR: Use the pre-fetched product collection.
            if (!$product = $products->get($itemData['product_id'])) {
                continue; // Failsafe
            }
            $totalAmount += $product->price * $itemData['quantity'];
            $sale->items()->create([
                'product_id' => $product->id,
                'quantity' => $itemData['quantity'],
                'price_at_sale' => $product->price,
            ]);
        }

        // Second, process deductions based on the aggregated requirements.
        foreach ($requiredIngredients as $itemId => $quantityToDeduct) {
            $itemInfo = $deductionData[$itemId];
            $item = $itemInfo['item'];
            $deductedQuantities[$itemId] = 0;

      if ($item->tracking_type === TrackingType::BY_PORTION) {
                $portionsToUse = $itemInfo['portions']->take($quantityToDeduct);

                if ($portionsToUse->isNotEmpty()) {
                    // 1. Update portion statuses.
                    $portionIds = $portionsToUse->pluck('id');
                    $newStatus = PortionStatus::USED->value;

                    DB::table('inventory_batch_portions')
                        ->whereIn('id', $portionIds)
                        ->update(['status' => $newStatus]);

                    // 2. Decrement batch quantities using a single, safe, parameterized query.
                    $batchCounts = $portionsToUse->countBy('inventory_batch_id');
                    $batchIdsToUpdate = $batchCounts->keys();

                    $cases = '';
                    $bindings = [];
                    foreach ($batchCounts as $batchId => $count) {
                        $cases .= "WHEN ? THEN remaining_quantity - ? ";
                        $bindings[] = $batchId;
                        $bindings[] = $count;
                    }

                    $idPlaceholders = implode(',', array_fill(0, count($batchIdsToUpdate), '?'));
                    $allBindings = array_merge($bindings, $batchIdsToUpdate->all());

                    DB::update(
                        "UPDATE inventory_batches SET remaining_quantity = (CASE id {$cases}END) WHERE id IN ({$idPlaceholders})",
                        $allBindings
                    );

                    // 3. Prepare logs for bulk insertion.
                    foreach ($portionsToUse as $portion) {
                        $logsToInsert[] = [
                            'inventory_batch_id' => $portion->inventory_batch_id,
                            'batch_portion_id' => $portion->id,
                            'user_id' => $sale->user_id,
                            'sale_id' => $sale->id,
                            'action' => LogAction::DEDUCTED_FOR_SALE->value,
                            'details' => json_encode(['quantity_deducted' => 1, 'portion_label' => $portion->label]),
                            'created_at' => $now, 'updated_at' => $now,
                        ];
                    }
                    $deductedQuantities[$itemId] = $portionsToUse->count();
                }
            } else {
                // Logic for quantity-tracked items (by_measure)
                $batches = $itemInfo['batches'];
                foreach ($batches as $batch) {
                    if ($quantityToDeduct <= 0) break;
                    $deductAmount = min($batch->remaining_quantity, $quantityToDeduct);

                    // This is a single decrement, which is acceptable here as it's iterative.
                    // A bulk update is more complex for this FIFO logic.
                    InventoryBatch::where('id', $batch->id)->decrement('remaining_quantity', $deductAmount);

                    $quantityToDeduct -= $deductAmount;
                     $deductedQuantities[$itemId] += $deductAmount;

                    $logsToInsert[] = [
                        'inventory_batch_id' => $batch->id,
                        'batch_portion_id' => null, // CRITICAL FIX: Ensure consistent array structure for bulk insert.
                        'user_id' => $sale->user_id,
                        'sale_id' => $sale->id,
                        'action' => LogAction::DEDUCTED_FOR_SALE->value,
                        'details' => json_encode(['quantity_deducted' => $deductAmount, 'unit' => $item->unit]),
                        'created_at' => $now, 'updated_at' => $now,
                    ];
                }
            }
        }

        // Post-deduction validation to ensure data integrity.
        $this->validateDeductions($requiredIngredients, $deductedQuantities);

        // PERFORMANCE REFACTOR: Use a single bulk insert for all log entries instead of creating them in a loop.
        // This reduces N queries to 1, which is massively more efficient.
        if (!empty($logsToInsert)) {
            InventoryLog::insert($logsToInsert);
        }

        return $totalAmount;
    }


      /**
     * Failsafe to ensure the total deducted quantity matches the required quantity.
     * If they don't match, it signifies a critical logic error, and we must abort the transaction.
     *
     * @throws \Exception
     */
    private function validateDeductions(array $required, array $deducted): void
    {
        foreach ($required as $itemId => $quantity) {
            if (!isset($deducted[$itemId]) || abs($deducted[$itemId] - $quantity) > 0.00001) {
                // This should never happen in normal operation. It indicates a severe logic bug.
                // Throwing a generic Exception ensures the DB transaction is rolled back.
                throw new \Exception(
                    "Critical Error: Inventory deduction mismatch for item ID {$itemId}. Transaction rolled back."
                );
            }
        }
    }
}
