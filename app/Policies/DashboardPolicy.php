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

    /**
     * Determine whether the user can view the dashboard.
     *
     * @param  \App\Models\User  $user
     * @return bool
     */
    public function view(User $user): bool
    {
        // Only owners and managers can view the dashboard. Staff are implicitly denied.
        return $user->isOwner() || $user->isManager();
    }
}
