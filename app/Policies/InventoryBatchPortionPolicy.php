<?php

namespace App\Policies;

use Illuminate\Auth\Access\Response;
use App\Models\InventoryBatchPortion;
use App\Models\User;

class InventoryBatchPortionPolicy
{
    /**
     * Determine whether the user can view any models.
     */
   public function viewAny(User $user): bool
    {
        // Any user can view lists of portions in context (e.g., on a batch page).
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, InventoryBatchPortion $inventoryBatchPortion): bool
    {
        // Any user can view a single portion's details (e.g., its log).
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Portions should NEVER be created directly. They are only created via the InventoryService
        // when a new batch is added. This prevents orphaned or invalid records.
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, InventoryBatchPortion $inventoryBatchPortion): bool
    {
        // Portions should NEVER be updated directly. Their status is changed via specific
        // service methods (e.g., recordAdjustment, recordSale) for logging and data integrity.
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, InventoryBatchPortion $inventoryBatchPortion): bool
    {
        // Portions are never deleted to maintain a permanent audit trail.
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, InventoryBatchPortion $inventoryBatchPortion): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, InventoryBatchPortion $inventoryBatchPortion): bool
    {
        return false;
    }
}
