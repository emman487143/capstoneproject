<?php

namespace App\Enums\Inventory;

enum AdjustmentType: string
{
    // Negative adjustments (remove stock)
    case SPOILAGE = 'Spoilage';
    case WASTE = 'Waste';
    case THEFT = 'Theft';

    // Positive adjustments (add stock)
    case FOUND = 'Found';
    case RETURNED = 'Returned';

    // Flexible adjustment
    case OTHER = 'Other';

    /**
     * Determines if this adjustment type adds to inventory.
     */
    public function isPositive(): bool
    {
        return match ($this) {
            self::FOUND, self::RETURNED => true,
            default => false
        };
    }

    /**
     * Determines if this adjustment type requires a reason.
     */
    public function requiresReason(): bool
    {
        return $this === self::OTHER;
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
            self::FOUND => LogAction::ADJUSTMENT_FOUND,
            self::RETURNED => LogAction::ADJUSTMENT_RETURNED,
            self::OTHER => LogAction::ADJUSTMENT_OTHER,
        };
    }

    /**
     * Maps the adjustment type to the resulting status for a portion.
     */
    public function toPortionStatus(): PortionStatus
    {
        return match ($this) {
            // Map to specific status values instead of generic "adjusted"
            self::SPOILAGE => PortionStatus::SPOILED,
            self::WASTE => PortionStatus::WASTED,
            self::THEFT => PortionStatus::MISSING,
            self::OTHER => PortionStatus::DAMAGED,  // Default for "Other" is now "Damaged"
            self::FOUND, self::RETURNED => PortionStatus::RESTORED,
        };
    }
}
