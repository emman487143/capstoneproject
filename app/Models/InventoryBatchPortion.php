<?php

namespace App\Models;

use App\Enums\Inventory\PortionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
class InventoryBatchPortion extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'inventory_batch_id',
        'current_branch_id',
        'label',
        'quantity', // Added to allow mass assignment
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'status' => PortionStatus::class,
    ];

    /**
     * Get the batch that this portion belongs to.
     */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(InventoryBatch::class, 'inventory_batch_id');
    }

    /**
     * Get the branch where this portion is currently located.
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'current_branch_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(InventoryLog::class, 'batch_portion_id');
    }
}
