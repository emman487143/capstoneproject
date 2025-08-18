<?php

namespace App\Enums\Transfers;

enum TransferItemStatus: string
{
    case PENDING = 'pending';
    case RECEIVED = 'received';
    case RECEIVED_WITH_ISSUES = 'received_with_issues';
    case REJECTED = 'rejected';
}
