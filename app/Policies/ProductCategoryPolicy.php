<?php

namespace App\Policies;

use App\Models\ProductCategory;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductCategoryPolicy
{
    use HandlesAuthorization;

    /**
     * Grant all permissions to admin users.
     */
    public function before(User $user, string $ability): bool|null
    {
        return $user->is_admin ? true : null;
    }

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
    public function view(User $user, ProductCategory $productCategory): bool
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
    public function update(User $user, ProductCategory $productCategory): bool
    {
        // Only owners can update categories
        return $user->role === 'owner';
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ProductCategory $productCategory): bool
    {
        // Only owners can delete categories
        return $user->role === 'owner';
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ProductCategory $productCategory): bool
    {
        // Only owners can restore categories (if soft delete is implemented)
        return $user->role === 'owner';
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, ProductCategory $productCategory): bool
    {
        // Only owners can permanently delete categories (if soft delete is implemented)
        return $user->role === 'owner';
    }
}
