<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInventoryCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // We'll add policies later
    }

    public function rules(): array
    {
        $categoryId = $this->route('category')->id;
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('inventory_categories')->ignore($categoryId)],
        ];
    }
}
