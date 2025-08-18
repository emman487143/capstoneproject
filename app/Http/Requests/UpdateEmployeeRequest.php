<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * @mixin \Illuminate\Http\Request
 */
class UpdateEmployeeRequest extends FormRequest
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
        $employee = $this->route('employee');
        $userId = $employee->user?->id;

        $rules = [
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'branch_id' => ['sometimes', 'required', 'exists:branches,id'],
            'job_title' => ['sometimes', 'required', 'string', 'max:255'],
            'contact_number' => ['sometimes', 'nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
            'create_user_account' => ['boolean'],
            // Make password optional on update, only validate if provided.
            'password' => ['nullable', 'confirmed', Password::defaults()],
        ];

        // Case A: Updating an existing user's details.
        if ($userId) {
            $rules['email'] = ['sometimes', 'required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users')->ignore($userId)];
            $rules['role'] = ['sometimes', 'required', 'in:manager,staff'];
        }
        // Case B: Creating a new user for an existing employee (should not happen via update, but good to have).
        else if ($this->input('create_user_account')) {
            $rules['email'] = ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users'];
            $rules['role'] = ['required', 'in:manager,staff'];
        }

        return $rules;
    }
}
