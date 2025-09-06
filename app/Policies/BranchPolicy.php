<?php

namespace App\Policies;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class BranchPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     * Only owners can view the branch list.
     */
    public function viewAny(User $user): bool
    {
        return $user->role === 'owner';
    }

    /**
     * Determine whether the user can view the model.
     * Only owners can view branch details.
     */
    public function view(User $user, Branch $branch): bool
    {
        return $user->role === 'owner';
    }

    /**
     * Determine whether the user can create models.
     * Only owners can create branches.
     */
    public function create(User $user): bool
    {
        return $user->role === 'owner';
    }

    /**
     * Determine whether the user can update the model.
     * Only owners can update branches.
     */
    public function update(User $user, Branch $branch): bool
    {
        return $user->role === 'owner';
    }

    /**
     * Determine whether the user can delete the model.
     * Only owners can delete/archive branches.
     */
    public function delete(User $user, Branch $branch): bool
    {
        return $user->role === 'owner';
    }

    /**
     * Determine whether the user can restore archived branches.
     * Only owners can restore branches.
     */
    public function restore(User $user, Branch $branch): bool
    {
        return $user->role === 'owner';
    }
}
