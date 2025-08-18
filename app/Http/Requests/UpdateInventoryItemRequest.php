<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Enums\Inventory\TrackingType;
use Illuminate\Validation\Rules\Enum;
class UpdateInventoryItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

   /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('inventory_items')->ignore($this->item->id)],
            'code' => ['required', 'string', 'max:50', Rule::unique('inventory_items')->ignore($this->item->id)],
            'description' => ['nullable', 'string', 'max:65535'],
            'inventory_category_id' => ['required', 'exists:inventory_categories,id'],
            'unit' => ['required', 'string', 'max:50'],
            'tracking_type' => ['required', new Enum(TrackingType::class)],
            'days_to_warn_before_expiry' => 'required|integer|min:1',
            'branches' => ['present', 'array'],
            'branches.*.branch_id' => ['required', 'exists:branches,id'],
            'branches.*.is_stocked' => ['required', 'boolean'],
            'branches.*.low_stock_threshold' => [
                'nullable',
                'required_if:branches.*.is_stocked,true',
                'numeric',
                'min:0',
                'max:99999999.99' // Matches decimal(10,2)
            ],
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
            'branches.*.low_stock_threshold.required_if' => 'The threshold is required when the item is stocked.',
            'branches.*.low_stock_threshold.numeric' => 'The threshold must be a number.',
            'branches.*.low_stock_threshold.min' => 'The threshold must be at least 0.',
        ];
    }
}
