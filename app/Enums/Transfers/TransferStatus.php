<?php

namespace App\Enums\Transfers;

enum TransferStatus: string
{
    case PENDING = 'pending';
    case COMPLETED = 'completed';
    case CANCELLED = 'cancelled';
 case REJECTED = 'rejected';
    public function isPending(): bool
    {
        return $this === self::PENDING;
    }

    public function isCompleted(): bool
    {
        return $this === self::COMPLETED;
    }

    public function isCancelled(): bool
    {
        return $this === self::CANCELLED;
    }
    public function isRejected(): bool
    {
        return $this === self::REJECTED;
    }
}
