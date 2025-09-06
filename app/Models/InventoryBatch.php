<?php

namespace App\Models;

use App\Enums\Inventory\LogAction;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;


class InventoryBatch extends Model
{
    /** @use HasFactory<\Database\Factories\InventoryBatchFactory> */
    use HasFactory;
     /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'inventory_item_id',
         'batch_number',
         'label',
        'branch_id',
        'received_at',
        'source',
        'quantity_received',
        'remaining_quantity',
        'unit_cost',
        'expiration_date',
    ];

    /**
     * The attributes that should be cast.
     *
     * This ensures the expiration_date is always a Carbon instance for easy manipulation.
     *
     * @var array<string, string>
     */
    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
            'expiration_date' => 'date',
            'quantity_received' => 'decimal:2',
            'remaining_quantity' => 'decimal:2',
            'unit_cost' => 'decimal:2',
        ];
    }

    /**
     * Get the inventory item that this batch belongs to.
     */
     public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get all the portions that belong to this batch.
     * This was the missing relationship causing the 500 error.
     */
   public function portions(): HasMany
    {
        return $this->hasMany(InventoryBatchPortion::class);
    }

    /**
     * Get all the logs for this batch.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(InventoryLog::class, 'inventory_batch_id');
    }

     /**
     * Scope a query to only include inventory batches available for transfer from a specific branch.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  \App\Models\Branch  $branch
     * @return \Illuminate\Database\Eloquent\Builder
     */
     public function scopeGetAvailableForTransfer(Builder $query, Branch $branch)
    {
        // FINAL CORRECTION: The database column is `remaining_quantity`.
        // This now aligns with the actual migration and schema.
        return $query->where('branch_id', $branch->id)
                     ->where('remaining_quantity', '>', 0)
                     ->with('item'); // Eager load the item relationship for efficiency
    }
    /**
     * Get negative adjustments for this batch.
     */
    public function negative_adjustments()
    {
        return $this->hasMany(InventoryLog::class, 'inventory_batch_id')
            ->whereIn('action', [
                LogAction::ADJUSTMENT_SPOILAGE->value,
                LogAction::ADJUSTMENT_WASTE->value,
                LogAction::ADJUSTMENT_THEFT->value,
                LogAction::ADJUSTMENT_OTHER->value,
            ])
            ->where(function($query) {
                // Case 1: direct quantity_change field is negative
                $query->whereRaw("JSON_EXTRACT(details, '$.quantity_change') < 0")
                // Case 2: quantity_adjusted with adjustment_direction=decrease
                ->orWhere(function($q) {
                    $q->whereRaw("JSON_EXTRACT(details, '$.quantity_adjusted') > 0")
                      ->whereRaw("JSON_EXTRACT(details, '$.adjustment_direction') = '\"decrease\"'");
                })
                // Case 3: original_quantity > new_quantity
                ->orWhere(function($q) {
                    $q->whereRaw("JSON_EXTRACT(details, '$.original_quantity') > JSON_EXTRACT(details, '$.new_quantity')");
                });
            })
            ->orderByDesc('created_at'); // Ensure newest adjustments appear first
    }
}
