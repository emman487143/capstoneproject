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
        $batch = $this->route('batch');
    // Calculate how much has already been used from this batch
    $used = $batch->quantity_received - $batch->remaining_quantity;

        return [
        'corrected_quantity' => [
            'required',
            'numeric',
            'min:' . $used, // Prevent setting below used
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
         $batch = $this->route('batch');
    $used = $batch->quantity_received - $batch->remaining_quantity;

        return [
            'corrected_quantity.required' => 'A corrected quantity is required.',
            'corrected_quantity.numeric' => 'The corrected quantity must be a number.',
            'corrected_quantity.min' => 'The corrected quantity must be greater than zero.',
            'reason.required' => 'A detailed reason for this correction is required.',
             'corrected_quantity.min' => "Corrected quantity cannot be less than the amount already used from this batch ({$used}).",
        ];
    }
}
