<?php

namespace App\Enums\Inventory;

enum AdjustmentType: string
{
    // Negative adjustments (remove stock)
    case SPOILAGE = 'Spoilage';     // Food that's gone bad
    case WASTE = 'Waste';           // Food discarded during preparation/service
    case THEFT = 'Theft';           // Confirmed stolen items
    case DAMAGED = 'Damaged';       // Physically damaged items (packaging, drops, etc.)
    case MISSING = 'Missing';       // Unaccounted items (not confirmed theft)
    case EXPIRED = 'Expired';       // Items past expiration date
    case STAFF_MEAL = 'Staff Meal'; // Used for employee meals
    case OTHER = 'Other';           // Flexible catch-all

    /**
     * All adjustment types in this enum are negative (remove stock)
     */
    public function isPositive(): bool
    {
        return false;
    }

    /**
     * Determines if this adjustment type requires a reason.
     */
    public function requiresReason(): bool
    {
        return in_array($this, [self::OTHER, self::MISSING]);
    }

    /**
     * Maps the adjustment type to its corresponding log action.
     */
    public function toLogAction(): LogAction
    {
        return match ($this) {
            self::SPOILAGE => LogAction::ADJUSTMENT_SPOILAGE,
            self::WASTE => LogAction::ADJUSTMENT_WASTE,
            self::THEFT => LogAction::ADJUSTMENT_THEFT,
            self::DAMAGED => LogAction::ADJUSTMENT_DAMAGED,
            self::MISSING => LogAction::ADJUSTMENT_MISSING,
            self::EXPIRED => LogAction::ADJUSTMENT_EXPIRED,
            self::STAFF_MEAL => LogAction::ADJUSTMENT_STAFF_MEAL,
            self::OTHER => LogAction::ADJUSTMENT_OTHER,
        };
    }

    /**
     * Maps the adjustssment type to the resulting status for a portion.
     */
    public function toPortionStatus(): PortionStatus
    {
        return match ($this) {
            self::SPOILAGE => PortionStatus::SPOILED,
            self::WASTE => PortionStatus::WASTED,
            self::THEFT => PortionStatus::STOLEN,
            self::DAMAGED => PortionStatus::DAMAGED,
            self::MISSING => PortionStatus::MISSING,
            self::EXPIRED => PortionStatus::EXPIRED,
            self::STAFF_MEAL => PortionStatus::CONSUMED,
            self::OTHER => PortionStatus::ADJUSTED,
        };
    }
}
