<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class DashboardPolicy
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
}
