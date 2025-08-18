<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class InventoryAdjustmentPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can create a new inventory adjustment.
     *
     * This logic centralizes the rule for all adjustment types. A user can record an
     * adjustment in a branch if they have the permission to create new inventory batches
     * within that same branch. This keeps the permissions consistent and logical.
     *
     * @param User $user
     * @param int|null $branchId The ID of the branch where the adjustment is being made.
     * @return bool
     */
    public function create(User $user, ?int $branchId): bool
    {
        // Admins can always create adjustments.
        if ($user->is_admin) {
            return true;
        }

        // If no branch is provided, the action is forbidden.
        if (!$branchId) {
            return false;
        }

        // A non-admin must be assigned to the specific branch to make an adjustment.
        return $user->employee?->branch_id === $branchId;
    }
}
