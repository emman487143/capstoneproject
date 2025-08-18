<?php

namespace App\Models;

use App\Enums\Inventory\TrackingType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class InventoryItem extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'code', // Added code field
        'description',
        'inventory_category_id',
        'unit',
        'tracking_type',
          'days_to_warn_before_expiry',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tracking_type' => TrackingType::class,
        ];
    }

    /**
     * Get the category that this inventory item belongs to.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(InventoryCategory::class, 'inventory_category_id');
    }

    /**
     * Get all the batches for this inventory item.
     */
    public function batches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class);
    }

    /**
     * Get all of the portions for the inventory item through the batches.
     */
    public function portions(): HasManyThrough
    {
        return $this->hasManyThrough(InventoryBatchPortion::class, InventoryBatch::class);
    }

    public function isPortionTracked()
{
    return $this->tracking_type === 'by_portion';
}
    /**
     * The branches that stock this inventory item.
     */
    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class)
            ->withPivot('low_stock_threshold')
            ->withTimestamps();
    }
}
