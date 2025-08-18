<?php

namespace App\Models;

use App\Enums\Transfers\TransferItemStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferItem extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'transfer_id',
        'inventory_item_id',
        'inventory_batch_id',
        'inventory_batch_portion_id',
        'quantity',
         'reception_status',
        'received_quantity',
        'reception_notes',
    ];
protected function casts(): array
    {
        return [
            // Cast the status field to our new Enum for type safety.
            'reception_status' => TransferItemStatus::class,
        ];
    }
    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'quantity' => 'decimal:2',
    ];

    /**
     * Get the parent transfer.
     */
    public function transfer(): BelongsTo
    {
        return $this->belongsTo(Transfer::class);
    }

    /**
     * Get the inventory item associated with the transfer item.
     */
    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    /**
     * Get the inventory batch associated with the transfer item.
     */
    public function inventoryBatch(): BelongsTo
    {
        return $this->belongsTo(InventoryBatch::class);
    }

    /**
     * Get the inventory batch portion associated with the transfer item.
     */
    public function inventoryBatchPortion(): BelongsTo
    {
        return $this->belongsTo(InventoryBatchPortion::class);
    }
}
