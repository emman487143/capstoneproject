<?php

namespace App\Enums\Inventory;

enum TrackingType: string
{
    case BY_PORTION = 'by_portion';
    case BY_MEASURE = 'by_measure';
}
