<?php

namespace App\Http\Requests;

use App\Models\InventoryBatch;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UpdateInventoryBatchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(Request $request): bool
    {
        return $request->user()->can('update', $request->route('batch'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $batch = $this->route('batch');

        return [
            // Instead of prohibited, ensure these values don't change if present
            'inventory_item_id' => ['sometimes', Rule::in([$batch->inventory_item_id])],
            'quantity_received' => ['sometimes', Rule::in([$batch->quantity_received])],
            'branch_id' => ['sometimes', Rule::in([$batch->branch_id])],

            // Fields that can be edited
            'source' => ['nullable', 'string', 'max:255'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'received_at' => ['required', 'date'],
            'expiration_date' => ['nullable', 'date', 'after_or_equal:received_at'],
        ];
    }
 /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'inventory_item_id.in' => 'The inventory item cannot be changed after creation.',
            'quantity_received.in' => 'The quantity received cannot be changed after creation. Use adjustments instead.',
            'branch_id.in' => 'The branch cannot be changed after creation. Use transfers instead.',
        ];
    }
}
