<?php

namespace App\Policies;

use App\Models\Transfer;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class TransferPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // For now, any authenticated user can view the list of transfers.
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Transfer $transfer): bool
    {
        // Owners and admins have full access to view any transfer
        if ($user->is_admin || $user->role === 'owner') {
            return true;
        }

        // Staff can view transfers related to their branch
        return $user->employee?->branch_id === $transfer->source_branch_id
            || $user->employee?->branch_id === $transfer->destination_branch_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Any authenticated user can attempt to create a transfer.
        // The FormRequest will handle more detailed validation.
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Transfer $transfer): bool
    {
        // Owners and admins should be able to receive any pending transfer
        if ($user->is_admin || $user->role === 'owner') {
            return $transfer->status->isPending();
        }

        // A staff user can update (i.e., receive) a transfer if they are at the destination branch
        // and the transfer is still pending.
        return $user->employee?->branch_id === $transfer->destination_branch_id && $transfer->status->isPending();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Transfer $transfer): bool
    {
        // Transfers are part of an audit trail and should not be physically deleted.
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Transfer $transfer): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Transfer $transfer): bool
    {
        return false;
    }

    /**
     * Determine whether the user can cancel a transfer.
     */
    public function cancel(User $user, Transfer $transfer): bool
    {
        // Owners and admins should be able to cancel any pending transfer
        if ($user->is_admin || $user->role === 'owner') {
            return $transfer->status->isPending();
        }

        // A staff user can cancel a transfer if they are at the source branch
        // and the transfer is still pending.
        return $user->employee?->branch_id === $transfer->source_branch_id && $transfer->status->isPending();
    }
}
