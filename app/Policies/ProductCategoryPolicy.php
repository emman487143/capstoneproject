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

    public function viewAny(User $user): bool
    {
        return false;
    }

    public function view(User $user, ProductCategory $productCategory): bool
    {
        return false;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, ProductCategory $productCategory): bool
    {
        return false;
    }

    public function delete(User $user, ProductCategory $productCategory): bool
    {
        return false;
    }
}
