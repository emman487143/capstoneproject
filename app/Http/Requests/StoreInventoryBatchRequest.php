<?php

namespace App\Http\Requests;

use App\Models\InventoryBatch;
use App\Models\InventoryItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Enums\Inventory\TrackingType;
use Carbon\Carbon;
class StoreInventoryBatchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Use the InventoryBatchPolicy to authorize this request.
        // The policy will check if the user is an admin or belongs to the target branch.
        return $this->user()->can('create', [InventoryBatch::class, $this->input('branch_id')]);

    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $itemId = $this->input('inventory_item_id');
        $item = InventoryItem::find($itemId);

        $quantityRules = ['required', 'numeric'];

        if ($item) {
            if ($item->tracking_type->value === 'by_portion') {
                // For portion-based items, quantity must be a whole number (integer) and at least 1.
                $quantityRules[] = 'integer';
                $quantityRules[] = 'min:1';
            } else { // 'by_quantity'
                // For quantity-based items, it can be a decimal and must be greater than 0.
                $quantityRules[] = 'min:0.01';
            }
        }

         return [
            'inventory_item_id' => ['required', 'exists:inventory_items,id'],
            'branch_id' => ['required', 'exists:branches,id'],
            'source' => ['nullable', 'string', 'max:255'],
            'quantity_received' => $quantityRules,
            'unit_cost' => ['nullable', 'numeric', 'min:0', 'required_if:item.tracking_type,by_portion'],
            'total_cost' => ['nullable', 'numeric', 'min:0', 'required_if:item.tracking_type,by_measure'],
              'received_at' => ['required', 'date'],
        'expiration_date' => ['nullable', 'date', 'after:received_at'],
            'action' => ['required', Rule::in(['save', 'save_and_add_another'])],
            'label' => ['nullable', 'string', 'max:255'],
        ];
    }
public function withValidator($validator)
{
    $validator->after(function ($validator) {
        // Convert to Carbon instance for proper date comparison
        $receivedDate = Carbon::parse($this->input('received_at'))->startOfDay();
        $today = Carbon::now()->startOfDay();

        if ($receivedDate->greaterThan($today)) {
            $validator->errors()->add('received_at', 'The received date cannot be in the future.');
        }
    });
}
    /**
     * Prepare the data for validation.
     *
     * This method calculates the unit_cost from total_cost for measure-tracked items,
     * ensuring data consistency before it hits the service layer.
     */
    protected function prepareForValidation(): void
    {
        $item = InventoryItem::find($this->input('inventory_item_id'));
        $quantity = (float) $this->input('quantity_received');
        $totalCost = (float) $this->input('total_cost');

        if ($item && $item->tracking_type === TrackingType::BY_MEASURE && $quantity > 0 && $totalCost > 0) {
            $this->merge([
                'unit_cost' => $totalCost / $quantity,  // Calculate unit cost from total
            ]);
        } elseif ($item && $item->tracking_type === TrackingType::BY_PORTION) {
            // For portion-tracked items, unit cost is the same as total cost per portion
            $this->merge([
                'unit_cost' => $this->input('unit_cost'),
            ]);
        }
    }
}
