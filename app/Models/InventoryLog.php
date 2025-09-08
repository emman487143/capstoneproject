<?php

namespace App\Models;

use App\Enums\Inventory\LogAction;
use App\Services\LogDetailFormatter;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryLog extends Model
{
    /** @use HasFactory<\Database\Factories\InventoryLogFactory> */
    use HasFactory;
    protected $fillable = [
        'inventory_batch_id',
        'batch_portion_id',
        'user_id',
        'sale_id',
        'action',
        'details',
    ];

    protected $appends = ['formatted_details'];

    protected function casts(): array
    {
        return [
            'action' => LogAction::class,
            'details' => 'array',
        ];
    }

    /**
     * Get the formatted details for the log entry.
     * This accessor automatically uses the LogDetailFormatter service.
     */
    protected function formattedDetails(): Attribute
    {
        return Attribute::make(
            get: fn () => app(LogDetailFormatter::class)->format($this),
        );
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(InventoryBatch::class, 'inventory_batch_id');
    }

    public function portion(): BelongsTo
    {
        return $this->belongsTo(InventoryBatchPortion::class, 'batch_portion_id');
    }

   public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
