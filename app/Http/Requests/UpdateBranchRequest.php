<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBranchRequest extends FormRequest
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
        // CORRECTED: To access the 'branch' model from the route, use $this->route('branch')
        $branchId = $this->route('branch')->id;

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('branches')->ignore($branchId)],
            'code' => ['required', 'string', 'max:10', Rule::unique('branches', 'code')->ignore($branchId)],
            'address' => ['required', 'string', 'max:255'],
            'phone_number' => ['nullable', 'string', 'max:20'], // Changed from 'required' to 'nullable'
        ];
    }
}
