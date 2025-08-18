<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;

class Product extends Model
{
    use HasFactory;
  /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['image_url'];

    protected $fillable = [
        'product_category_id',
        'name',
        'description',
        'image_path',
        'price',
        'is_addon',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_addon' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the URL for the product image
     *
     * @return \Illuminate\Database\Eloquent\Casts\Attribute
     */
    protected function imageUrl(): Attribute
    {
        return Attribute::make(
            get: function () {
                if (!$this->image_path) {
                    return null;
                }

                // Use asset() helper to ensure correct URL format with domain
                return asset('storage/' . $this->image_path);
            }
        );
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'product_category_id');
    }

    public function ingredients(): BelongsToMany
    {
        return $this->belongsToMany(InventoryItem::class, 'product_ingredients')
            ->withPivot('quantity_required')
            ->withTimestamps();
    }

    /**
     * The branches where this product is available.
     */
    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class, 'branch_product')
            ->withPivot('is_available')
            ->withTimestamps();
    }

    /**
     * Scope a query to only include products available at a specific branch.
     */
    public function scopeAvailableAt($query, $branchId)
    {
        return $query->whereHas('branches', function ($query) use ($branchId) {
            $query->where('branch_id', $branchId)
                  ->where('is_available', true);
        });
    }
}
