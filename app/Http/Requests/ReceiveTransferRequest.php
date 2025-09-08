<?php

namespace App\Http\Requests;

use App\Enums\Transfers\TransferItemStatus;
use App\Models\Transfer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReceiveTransferRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var Transfer $transfer */
        $transfer = $this->route('transfer');

        // The user must have permission to update the transfer.
        return $this->user()->can('update', $transfer);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'integer', Rule::exists('transfer_items', 'id')->where('transfer_id', $this->route('transfer')->id)],
            'items.*.reception_status' => ['required', Rule::enum(TransferItemStatus::class)],
            'items.*.reception_notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
