<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'product_category_id' => ['required', 'exists:product_categories,id'],
            'is_addon' => ['boolean'],
            'is_active' => ['boolean'],
            'image' => ['nullable', 'image', 'max:2048'],
            'ingredients' => ['array'],
            'ingredients.*.inventory_item_id' => ['required', 'exists:inventory_items,id'],
            'ingredients.*.quantity_required' => ['required', 'numeric', 'min:0.01'],

            // Add explicit validation for branches array
            'branches' => ['array'],
            'branches.*.branch_id' => ['required', 'exists:branches,id'],
            'branches.*.is_available' => ['boolean'],
        ];
    }
}
