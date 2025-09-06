<?php

namespace App\Policies;

use App\Models\InventoryCategory;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class InventoryCategoryPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Allow owners and managers to view categories
        return $user->role === 'owner' || $user->role === 'manager';
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, InventoryCategory $inventoryCategory): bool
    {
        // Allow owners and managers to view category details
        return $user->role === 'owner' || $user->role === 'manager';
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Only owners can create categories
        return $user->role === 'owner';
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, InventoryCategory $inventoryCategory): bool
    {
        // Only owners can update categories
        return $user->role === 'owner';
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, InventoryCategory $inventoryCategory): bool
    {
        // Only owners can delete categories
        return $user->role === 'owner';
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, InventoryCategory $inventoryCategory): bool
    {
        // Categories don't use soft deletes, but if implemented:
        return $user->role === 'owner';
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, InventoryCategory $inventoryCategory): bool
    {
        // Not applicable, but if needed:
        return $user->role === 'owner';
    }
}
