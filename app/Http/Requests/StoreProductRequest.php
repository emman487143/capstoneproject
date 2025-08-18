<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
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
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'price' => 'required|numeric|min:0',
            'product_category_id' => 'nullable|exists:product_categories,id',
            'is_addon' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
            'image' => 'nullable|image|max:2048',
            'ingredients' => 'sometimes|array',
            'ingredients.*.inventory_item_id' => 'required|exists:inventory_items,id',
            'ingredients.*.quantity_required' => 'required|numeric|min:0',
            'branches' => 'sometimes|array',
            'branches.*.branch_id' => 'required|exists:branches,id',
            'branches.*.name' => 'sometimes|string',
            'branches.*.is_available' => 'required|boolean',
        ];
    }
}
