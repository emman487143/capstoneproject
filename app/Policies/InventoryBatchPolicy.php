<?php

namespace App\Policies;

use Illuminate\Auth\Access\Response;
use App\Models\InventoryBatch;
use App\Models\User;

class InventoryBatchPolicy
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
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
   public function view(User $user, InventoryBatch $inventoryBatch): bool
    {
        // CORRECTED: Use the employee relationship correctly and handle nulls.
        return $user->employee?->branch_id === $inventoryBatch->branch_id;
    }

    /**
     * Determine whether the user can create models.
     */
  public function create(User $user, ?int $branchId = null): bool
    {
        // DEFINITIVE FIX: The method signature now accepts a branch ID, aligning it with the
        // authorization check in the controller and Form Request. This was the root cause of the 403 error.

        // Admins can always create batches, regardless of branch context.
        if ($user->is_admin) {
            return true;
        }

        // For non-admins, a branch context is mandatory.
        if (is_null($branchId)) {
            return false;
        }

        // A non-admin user can create a batch if they are assigned to that specific branch.
        return $user->employee?->branch_id === $branchId;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, InventoryBatch $inventoryBatch): bool
    {
        // DEFINITIVE FIX: Correctly access the employee relationship via the nullsafe operator.
        // This ensures that if a user is not an employee or not assigned to a branch,
        // the check will safely fail instead of causing an error.
        return $user->employee?->branch_id === $inventoryBatch->branch_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, InventoryBatch $inventoryBatch): bool
    {
        // Deleting batches is intentionally disabled to preserve data integrity.
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, InventoryBatch $inventoryBatch): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, InventoryBatch $inventoryBatch): bool
    {
        return false;
    }

    /**
     * Determine whether the user can correct the initial count of a batch.
     */
    public function correctCount(User $user, InventoryBatch $batch): bool
    {
        // A manager can perform this action if they are in the same branch.
        // Owners are handled by the `before` method.
        return $user->isManager() && $user->employee?->branch_id === $batch->branch_id;
    }

    /**
     * Determine whether the user can restore portions for a batch.
     */
    public function restorePortions(User $user, InventoryBatch $batch): bool
    {
        // A manager can perform this action if they are in the same branch.
        return $user->isManager() && $user->employee?->branch_id === $batch->branch_id;
    }

    /**
     * Determine whether the user can restore quantity for a batch.
     */
    public function restoreQuantity(User $user, InventoryBatch $batch): bool
    {
        // A manager can perform this action if they are in the same branch.
        return $user->isManager() && $user->employee?->branch_id === $batch->branch_id;
    }
}
