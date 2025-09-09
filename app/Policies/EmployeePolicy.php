<?php

namespace App\Policies;

use Illuminate\Auth\Access\Response;
use App\Models\Employee;
use App\Models\User;

class EmployeePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Only owners and managers can view the employee list
        return $user->isOwner() || $user->isManager();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Employee $employee): bool
    {
        // Only owners and managers can view employee details
        return $user->isOwner() || $user->isManager();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Owners and managers can create employees.
        return $user->isOwner() || $user->isManager();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Employee $employee): bool
    {
        // A manager can update an employee if they are in the same branch.
        if ($user->isManager()) {
            return $user->employee?->branch_id === $employee->branch_id;
        }

        // Owners can always update.
        return $user->isOwner();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Employee $employee): bool
    {
        // A manager can archive an employee if they are in the same branch.
        if ($user->isManager()) {
            return $user->employee?->branch_id === $employee->branch_id;
        }
        return $user->isOwner();
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Employee $employee): bool
    {
        // A manager can restore an employee if they were in the same branch.
        if ($user->isManager()) {
            return $user->employee?->branch_id === $employee->branch_id;
        }
        return $user->isOwner();
    }
}
