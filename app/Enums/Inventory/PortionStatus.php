<?php

namespace App\Enums\Inventory;

enum PortionStatus: string
{
    // Primary statuses
    case UNUSED = 'unused';     // Available for use
    case USED = 'used';         // Properly used in production

    // Specific adjustment reasons (replacing generic "adjusted")
    case SPOILED = 'spoiled';   // Discarded due to spoilage/expiration
    case WASTED = 'wasted';     // Discarded during production/handling
    case MISSING = 'missing';   // Cannot be accounted for (theft/loss)
    case DAMAGED = 'damaged';   // Partially damaged but potentially usable

    // Transfer statuses
    case TRANSFERRED = 'transferred'; // Successfully moved to another branch
    case IN_TRANSIT = 'in_transit';   // Currently in transit between branches

    // Administrative statuses
    case RESTORED = 'restored';  // Previously adjusted portion returned to inventory

    /**
     * Get the display name for this status
     */
    public function displayName(): string
    {
        return match($this) {
            self::UNUSED => 'Unused',
            self::USED => 'Used',
            self::SPOILED => 'Spoiled',
            self::WASTED => 'Wasted',
            self::MISSING => 'Missing',
            self::DAMAGED => 'Damaged',
            self::TRANSFERRED => 'Transferred',
            self::IN_TRANSIT => 'In Transit',
            self::RESTORED => 'Restored',
        };
    }

    /**
     * Get the badge color for this status
     */
    public function badgeColor(): string
    {
        return match($this) {
            self::UNUSED => 'bg-green-500',
            self::USED => 'bg-blue-500',
            self::SPOILED => 'bg-orange-500',
            self::WASTED => 'bg-red-500',
            self::MISSING => 'bg-purple-600',
            self::DAMAGED => 'bg-yellow-500',
            self::TRANSFERRED => 'bg-cyan-500',
            self::IN_TRANSIT => 'bg-amber-500',
            self::RESTORED => 'bg-emerald-500',
        };
    }
}
