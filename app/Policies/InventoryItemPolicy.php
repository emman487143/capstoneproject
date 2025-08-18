<?php

namespace App\Policies;

use App\Models\InventoryItem;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class InventoryItemPolicy
{
    /**
     * Perform pre-authorization checks.
     */
    public function before(User $user, string $ability): bool|null
    {
        if ($user->is_admin) {
            return true;
        }

        return null;
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->is_admin;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, InventoryItem $inventoryItem): bool
    {
        if ($user->is_admin) {
            return true;
        }

        // Check if the item is available in the employee's branch
        return $inventoryItem->branches()->where('branch_id', $user->employee?->branch_id)->exists();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // An admin can always create. Other users must be an employee.
        return $user->is_admin || $user->employee !== null;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, InventoryItem $inventoryItem): bool
    {
        return $user->employee->branch_id === $inventoryItem->branch_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, InventoryItem $inventoryItem): bool
    {
        return $user->employee->branch_id === $inventoryItem->branch_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, InventoryItem $inventoryItem): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, InventoryItem $inventoryItem): bool
    {
        return false;
    }
}
