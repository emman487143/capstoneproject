<?php

namespace App\Enums\Inventory;

enum PortionStatus: string
{
    // Primary statuses
    case UNUSED = 'unused';     // Available for use
    case USED = 'used';         // Properly sused in production

    // Specific adjustment reasons
    case SPOILED = 'spoiled';   // Discarded due to spoilage/expiration
    case WASTED = 'wasted';     // Discarded during production/handling
    case STOLEN = 'stolen';     // Confisrmed theft (with evidence)
    case MISSING = 'missing';   // Cannot be accounted for (no evidence of theft)
    case DAMAGED = 'damaged';   // Partially damaged but potentially usable
    case EXPIRED = 'expired';   // No longer valid for use
    case CONSUMED = 'consumed'; // Used up in production
    case ADJUSTED = 'adjusted'; // Generic adjustment for other reasons

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
            self::STOLEN => 'Stolen',
            self::MISSING => 'Missing',
            self::DAMAGED => 'Damaged',
            self::EXPIRED => 'Expired',
            self::CONSUMED => 'Consumed',
            self::TRANSFERRED => 'Transferred',
            self::IN_TRANSIT => 'In Transit',
            self::RESTORED => 'Restored',
            self::ADJUSTED => 'Adjusted',
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
            self::STOLEN => 'bg-purple-600',
            self::MISSING => 'bg-indigo-500', // Using indigo for missing items
            self::DAMAGED => 'bg-yellow-500',
            self::EXPIRED => 'bg-gray-500',
            self::CONSUMED => 'bg-pink-500',
            self::TRANSFERRED => 'bg-cyan-500',
            self::IN_TRANSIT => 'bg-amber-500',
            self::RESTORED => 'bg-emerald-500',
        };
    }
}
