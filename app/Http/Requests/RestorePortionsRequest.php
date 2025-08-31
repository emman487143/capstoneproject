<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
class RestorePortionsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('restorePortions', $this->route('batch'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
 public function rules(): array
    {
        return [
            'portion_ids' => ['required', 'array', 'min:1'],
            'portion_ids.*' => [
                'integer',
                // Use explicit exists rule without soft delete check
                Rule::exists('inventory_batch_portions', 'id')
            ],
            'reason' => ['required', 'string', 'max:255'],
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
            'portion_ids.required' => 'At least one portion must be selected for restoration.',
            'portion_ids.array' => 'Invalid portion selection format.',
            'portion_ids.min' => 'At least one portion must be selected for restoration.',
            'reason.required' => 'A reason for restoring these portions is required.',
            'reason.min' => 'The reason must be at least 10 characters.',
        ];
    }
}
