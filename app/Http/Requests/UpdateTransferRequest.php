<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTransferRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Authorization is handled by the TransferPolicy via the controller's authorizeResource method.
        // The policy ensures the user is at the destination branch and the transfer is pending.
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // When receiving a transfer, the user might add notes about the condition of the items.
        // The core data of the transfer is immutable at this stage.
        return [
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
