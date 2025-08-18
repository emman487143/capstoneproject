<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules;

/**
 * @mixin \Illuminate\Http\Request
 */
class StoreEmployeeRequest extends FormRequest
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
      $rules = [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'branch_id' => ['required', 'exists:branches,id'],
            'job_title' => ['required', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:20'],
            // CORRECTED: Added the missing validation rule for the 'is_active' field.
            // This ensures the value is passed to the controller after validation.
            'is_active' => ['required', 'boolean'],
            'create_user_account' => ['boolean'],
        ];

        // If the 'create_user_account' checkbox is checked, add rules for user fields.
        if ($this->input('create_user_account')) {
            $rules['email'] = ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users'];
            $rules['password'] = ['required', 'confirmed', Rules\Password::defaults()];
            $rules['role'] = ['required', 'in:manager,staff']; // Owner role cannot be assigned here.
        }

        return $rules;
    }
}
