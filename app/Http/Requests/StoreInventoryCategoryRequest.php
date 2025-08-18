<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInventoryCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // We'll add policies later
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255|unique:inventory_categories,name',
        ];
    }
}
