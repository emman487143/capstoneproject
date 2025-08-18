<?php

namespace App\Http\Requests;

use App\Enums\Inventory\PortionStatus;
use App\Enums\Inventory\TrackingType;
use App\Models\InventoryBatch;
use App\Models\InventoryBatchPortion;
use App\Models\InventoryItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreTransferRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Authorization is handled by the controller's authorizeResource method.
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'source_branch_id' => ['required', 'integer', 'exists:branches,id'],
            'destination_branch_id' => ['required', 'integer', 'exists:branches,id', 'different:source_branch_id'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.inventory_item_id' => ['required', 'integer', 'exists:inventory_items,id'],
            'items.*.tracking_type' => ['required', 'string', Rule::in(array_column(TrackingType::cases(), 'value'))],

            // Portion-based validation
            'items.*.portion_ids' => ['required_if:items.*.tracking_type,'.TrackingType::BY_PORTION->value, 'array', 'min:1'],
            'items.*.portion_ids.*' => ['integer', 'exists:inventory_batch_portions,id'],

            // Batch-based validation
            'items.*.batches' => ['required_if:items.*.tracking_type,'.TrackingType::BY_MEASURE->value, 'array', 'min:1'],
            'items.*.batches.*.batch_id' => ['required', 'integer', 'exists:inventory_batches,id'],
            'items.*.batches.*.quantity' => ['required', 'numeric', 'gt:0'],
        ];
    }

    /**
     * Configure the validator instance.
     * This is where we add complex, cross-field, and database-dependent validation logic.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $data = $validator->getData();
            $sourceBranchId = $data['source_branch_id'];
            $items = collect($data['items']);

            foreach ($items as $index => $itemData) {
                $item = InventoryItem::find($itemData['inventory_item_id']);

                // Ensure the item's tracking type from the DB matches the request.
                if ($item->tracking_type->value !== $itemData['tracking_type']) {
                    $validator->errors()->add("items.{$index}.tracking_type", 'Item tracking type mismatch.');
                    continue;
                }

                // Validate portion-tracked items
                 if ($itemData['tracking_type'] === TrackingType::BY_PORTION->value) {
                        $portions = InventoryBatchPortion::with('batch')->findMany($itemData['portion_ids']);
                        foreach ($portions as $portion) {
                            // Rule: Ensure the portion's batch belongs to the specified item.
                            if ($portion->batch->inventory_item_id != $item->id) {
                                $validator->errors()->add("items.{$index}.portion_ids", "Portion {$portion->label} does not belong to {$item->name}.");
                            }
                            if ($portion->batch->branch_id != $sourceBranchId) {
                                $validator->errors()->add("items.{$index}.portion_ids", "Portion {$portion->label} is not at the source branch.");
                            }
                            if ($portion->status !== PortionStatus::UNUSED) {
                                $validator->errors()->add("items.{$index}.portion_ids", "Portion {$portion->label} is not available for transfer.");
                            }
                        }
                    }

                // Validate batch-tracked items
                if ($itemData['tracking_type'] === TrackingType::BY_MEASURE->value) {
                    foreach ($itemData['batches'] as $batchIndex => $batchData) {
                        $batch = InventoryBatch::find($batchData['batch_id']);
                        if ($batch->branch_id != $sourceBranchId) {
                            $validator->errors()->add("items.{$index}.batches.{$batchIndex}.batch_id", "Batch #{$batch->batch_number} is not at the source branch.");
                        }
                        if ($batch->remaining_quantity < $batchData['quantity']) {
                            $validator->errors()->add("items.{$index}.batches.{$batchIndex}.quantity", "Insufficient stock for Batch #{$batch->batch_number}. Requested: {$batchData['quantity']}, Available: {$batch->remaining_quantity}.");
                        }
                    }
                }
            }
        });
    }
}
