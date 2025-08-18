<?php

namespace App\Http\Requests;

use App\Enums\Inventory\TrackingType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInventoryItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // For now, we'll allow any authenticated user.
        // This can be updated later with role-based authorization.
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
            'name' => 'required|string|max:255|unique:inventory_items,name',
            'code' => 'required|string|max:50|unique:inventory_items,code', // New code field
            'description' => 'nullable|string|max:1000',
            'inventory_category_id' => 'required|integer|exists:inventory_categories,id',
            'unit' => 'required|string|max:50',
            'tracking_type' => ['required', 'string', Rule::enum(TrackingType::class)],
'days_to_warn_before_expiry' => 'required|integer|min:1',
            // Validate the branches array
            'branches' => 'required|array|min:1',
            'branches.*.branch_id' => 'required|integer|exists:branches,id',
            'branches.*.is_stocked' => 'required|boolean',
            'branches.*.low_stock_threshold' => [
                'nullable',
                'required_if:branches.*.is_stocked,true',
                'numeric',
                'min:0',
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
            'branches.*.low_stock_threshold.required_if' => 'The low stock threshold is required when the item is stocked at a branch.',
        ];
    }
}
