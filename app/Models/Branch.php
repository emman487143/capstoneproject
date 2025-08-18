<?php

namespace App\Models;

use App\Models\InventoryBatch;
use App\Models\InventoryBatchPortion; // CORRECTED: Removed the non-existent 'Inventory' sub-namespace
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['name', 'address', 'phone_number', 'code'];

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    /**
     * The inventory items that are stocked at this branch.
     */
    public function inventoryItems(): BelongsToMany
    {
        return $this->belongsToMany(InventoryItem::class, 'branch_inventory_item')
            ->withPivot('low_stock_threshold', 'is_stocked')
            ->withTimestamps();
    }

    public function inventoryBatches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class);
    }

    public function inventoryBatchPortions(): HasMany
    {
        return $this->hasMany(InventoryBatchPortion::class, 'current_branch_id');
    }
}
