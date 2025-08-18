<?php

namespace App\Enums\Inventory;

enum LogAction: string
{
    // Existing actions
    case BATCH_CREATED = 'batch_created';
    case PORTIONS_CREATED = 'portions_created';
    case DEDUCTED_FOR_SALE = 'deducted_for_sale';
    case TRANSFER_INITIATED = 'transfer_initiated';
    case TRANSFER_RECEIVED = 'transfer_received';
    case TRANSFER_CANCELLED = 'transfer_cancelled';
    case TRANSFER_REJECTED = 'transfer_rejected';

    // Existing adjustment actions
    case ADJUSTMENT_SPOILAGE = 'adjustment_spoilage';
    case ADJUSTMENT_WASTE = 'adjustment_waste';
    case ADJUSTMENT_THEFT = 'adjustment_theft';
    case ADJUSTMENT_OTHER = 'adjustment_other';

    // New positive adjustment actions (we'll still keep these for now)
    case ADJUSTMENT_FOUND = 'adjustment_found';
    case ADJUSTMENT_RETURNED = 'adjustment_returned';

    // New administrative correction action
    case BATCH_COUNT_CORRECTED = 'batch_count_corrected';

    // New restoration action
    case PORTION_RESTORED = 'portion_restored';

    /**
     * Determines if this action requires admin permission.
     */
    public function requiresAdminPermission(): bool
    {
        return in_array($this, [self::BATCH_COUNT_CORRECTED, self::PORTION_RESTORED]);
    }
}
