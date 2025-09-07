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
        return $this->user()->can('create', [InventoryBatch::class, $branchId]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * FIX: Include all potentially required fields for any adjustment type
     */
    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'exists:branches,id'],
            'inventory_item_id' => ['required', 'exists:inventory_items,id'],
            'type' => ['required', 'string', new Enum(AdjustmentType::class)],
            'inventory_batch_id' => ['nullable', 'exists:inventory_batches,id'], // Changed from required
            'quantity' => ['nullable', 'numeric', 'min:0.01'],
            // Add the missing portion_ids fields back
            'portion_ids' => ['nullable', 'array'],
            'portion_ids.*' => ['integer', 'exists:inventory_batch_portions,id'],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * Set up conditional validation requirements based on input type
     */
    protected function prepareForValidation(): void
    {
        // Initialize empty arrays if they're not present but might be needed
        if ($this->has('inventory_item_id')) {
            $item = InventoryItem::find($this->input('inventory_item_id'));
            if ($item && $item->tracking_type === TrackingType::BY_PORTION && !$this->has('portion_ids')) {
                $this->merge(['portion_ids' => []]);
            }
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->any()) {
                return;
            }

            $item = InventoryItem::find($this->input('inventory_item_id'));
            if (!$item) {
                $validator->errors()->add('inventory_item_id', 'The selected inventory item could not be found.');
                return;
            }

            // Type-specific validation
            if ($item->tracking_type === TrackingType::BY_PORTION) {
                $this->validatePortionAdjustment($validator, $item);
            } elseif ($item->tracking_type === TrackingType::BY_MEASURE) {
                $this->validateQuantityAdjustment($validator, $item);
            }

            // Always validate reason for types that require it
            $type = $this->input('type');
            if (($type === AdjustmentType::OTHER->value || $type === AdjustmentType::MISSING->value) && !$this->filled('reason')) {
                $validator->errors()->add('reason', 'A reason is required for this adjustment type.');
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
            return;
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
                return;
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
