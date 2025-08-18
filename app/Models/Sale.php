<?php

namespace App\Models;

use App\Enums\SaleStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $fillable = [
        'branch_id',
        'user_id',
        'status',
        'total_amount',
        'notes',
    ];

   /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'status' => SaleStatus::class,
        'total_amount' => 'float',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }
}
