<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    use HasFactory;

protected $guarded = ['id'];

    protected $fillable = [
        'sale_id',
        'product_id',
        'quantity',
        'price_at_sale',
    ];

   /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'price_at_sale' => 'float',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
