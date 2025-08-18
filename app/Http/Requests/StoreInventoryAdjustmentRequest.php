<?php

namespace App\Http\Requests;

use App\Enums\Inventory\AdjustmentType;
use App\Enums\Inventory\TrackingType;
use App\Models\InventoryBatch;
use App\Models\InventoryBatchPortion;
use App\Models\InventoryItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\Validator;

class StoreInventoryAdjustmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
     public function authorize(): bool
    {
        $item = InventoryItem::find($this->input('inventory_item_id'));

        if (!$item) {
            return false;
        }

        $branchId = $this->input('branch_id');

        // If this is a batch adjustment, the branch_id isn't sent directly.
        // We must derive it from the batch itself.
        if ($item->tracking_type === TrackingType::BY_MEASURE) {
            $batch = InventoryBatch::find($this->input('inventory_batch_id'));
            $branchId = $batch?->branch_id;
        }

        // The correct check: Can the user create inventory records in this specific branch?
        // This now correctly calls the updated InventoryBatchPolicy@create method for all cases.
        return $this->user()->can('create', [InventoryBatch::class, $branchId]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * REFACTOR: Simplify rules to their most basic form. Complex conditional logic
     * is moved to `withValidator` for a more robust, sequential process.
     */
    public function rules(): array
    {
        return [
            'inventory_item_id' => ['required', 'integer', 'exists:inventory_items,id'],
            'type' => ['required', new Enum(AdjustmentType::class)],
            'reason' => ['required_if:type,Other', 'nullable', 'string', 'max:255'],

            // Conditional fields are now validated in `withValidator`.
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'portion_ids' => ['nullable', 'array'],
            'portion_ids.*' => ['integer', 'exists:inventory_batch_portions,id'],
            'inventory_batch_id' => ['nullable', 'integer', 'exists:inventory_batches,id'],
            'quantity' => ['nullable', 'numeric', 'min:0.01'],
        ];
    }

    /**
     * Configure the validator instance.
     *
     * REFACTOR: This hook now orchestrates all complex validation. It first determines the
     * item's tracking type and then applies the appropriate validation logic sequentially,
     * ensuring data integrity and preventing race conditions.
     */
     public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->any()) {
                return;
            }

            $item = InventoryItem::find($this->input('inventory_item_id'));
            // This check is technically redundant due to the 'exists' rule, but it's a crucial safeguard.
            if (!$item) {
                $validator->errors()->add('inventory_item_id', 'The selected inventory item could not be found.');
                return;
            }

            // DEFINITIVE FIX: The core logic was flawed. We must first check the item's tracking type
            // and *then* delegate to the appropriate validation method. This prevents the fatal error
            // caused by trying to validate portion data on a batch-based request.
            if ($item->tracking_type === TrackingType::BY_PORTION) {
                $this->validatePortionAdjustment($validator, $item);
            } elseif ($item->tracking_type === TrackingType::BY_MEASURE) {
                $this->validateQuantityAdjustment($validator, $item);
            }
        });
    }
    /**
     * Validates data for a portion-based adjustment.
     */
    private function validatePortionAdjustment(Validator $validator, InventoryItem $item): void
    {
        // Rule: branch_id is required for portion adjustments.
        $branchId = $this->input('branch_id');
        if (!$branchId) {
            $validator->errors()->add('branch_id', 'A branch must be selected for portion-based adjustments.');
            return; // Stop validation if fundamental data is missing.
        }

        // Rule: portion_ids must be a non-empty array.
        $portionIds = $this->input('portion_ids');
        if (empty($portionIds) || !is_array($portionIds)) {
            $validator->errors()->add('portion_ids', 'You must select at least one portion to adjust.');
            return;
        }

        // Rule: All selected portions must belong to the specified item and branch.
        $portions = InventoryBatchPortion::with('batch:id,inventory_item_id,branch_id')
            ->whereIn('id', $portionIds)
            ->get();

        if ($portions->count() !== count($portionIds)) {
            $validator->errors()->add('portion_ids', 'One or more selected portions are invalid or could not be found.');
            return;
        }

        foreach ($portions as $portion) {
            if ($portion->batch->inventory_item_id !== $item->id || $portion->batch->branch_id != $branchId) {
                $validator->errors()->add(
                    'portion_ids',
                    "Portion '{$portion->label}' does not belong to the selected item or branch."
                );
                return; // Stop on first error.
            }
        }
    }

    /**
     * Validates data for a quantity-based adjustment.
     */
    private function validateQuantityAdjustment(Validator $validator, InventoryItem $item): void
    {
        // Rule: inventory_batch_id is required.
        $batchId = $this->input('inventory_batch_id');
        if (!$batchId) {
            $validator->errors()->add('inventory_batch_id', 'You must select a batch to adjust.');
            return;
        }

        // Rule: quantity is required.
        $quantity = $this->input('quantity');
        if (!$quantity) {
            $validator->errors()->add('quantity', 'The adjustment quantity is required.');
            return;
        }

        $batch = InventoryBatch::find($batchId);

        // Rule: The selected batch must belong to the specified item.
        if ($batch->inventory_item_id !== $item->id) {
            $validator->errors()->add(
                'inventory_batch_id',
                "The selected batch does not belong to the item '{$item->name}'."
            );
            return;
        }

        // Rule: Adjustment quantity cannot exceed the batch's remaining quantity.
        if ((float) $quantity > $batch->remaining_quantity) {
            $validator->errors()->add(
                'quantity',
                "Adjustment quantity ({$quantity}) cannot exceed the batch's remaining quantity ({$batch->remaining_quantity})."
            );
        }
    }
}
