<?php

namespace App\Models;

use App\Enums\Transfers\TransferStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transfer extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'source_branch_id',
        'destination_branch_id',
        'sending_user_id',
        'receiving_user_id',
        'status',
        'sent_at',
        'received_at',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'status' => TransferStatus::class,
        'sent_at' => 'datetime',
        'received_at' => 'datetime',
    ];

    /**
     * Get the items included in the transfer.
     */
    public function items(): HasMany
    {
        return $this->hasMany(TransferItem::class);
    }

    /**
     * Get the source branch for the transfer.
     */
    public function sourceBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'source_branch_id');
    }

    /**
     * Get the destination branch for the transfer.
     */
    public function destinationBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'destination_branch_id');
    }

    /**
     * Get the user who sent the transfer.
     */
    public function sendingUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sending_user_id');
    }

    /**
     * Get the user who received the transfer.
     */
    public function receivingUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receiving_user_id');
    }

    public function user()
{
    return $this->belongsTo(User::class);
}
}
