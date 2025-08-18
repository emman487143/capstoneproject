<?php
// app/Enums/UserRole.php
enum UserRole: string
{
    case OWNER = 'owner';
    case MANAGER = 'manager';
    case STAFF = 'staff';

    public function canManageUsers(): bool
    {
        return $this === self::OWNER || $this === self::MANAGER;
    }

    public function canAdjustInventory(): bool
    {
        return $this === self::OWNER || $this === self::MANAGER;
    }

    // More permission helper methods
}
