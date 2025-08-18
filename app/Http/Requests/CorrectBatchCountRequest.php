<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CorrectBatchCountRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $batch = $this->route('batch');
        return $this->user()->can('correctCount', $batch);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'corrected_quantity' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'min:10', 'max:255'],
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
            'corrected_quantity.required' => 'A corrected quantity is required.',
            'corrected_quantity.numeric' => 'The corrected quantity must be a number.',
            'corrected_quantity.min' => 'The corrected quantity must be greater than zero.',
            'reason.required' => 'A detailed reason for this correction is required.',
            'reason.min' => 'The reason must be at least 10 characters.',
        ];
    }
}
