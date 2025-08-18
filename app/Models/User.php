<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_admin',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_admin' => 'boolean',
    ];

    /**
     * Get the employee record associated with the user.
     */
    public function employee(): HasOne
    {
        return $this->hasOne(Employee::class);
    }
    public function isOwner(): bool
{
    return $this->is_admin; // Owners are already marked as admins
}

public function isManager(): bool
{
    return $this->role === 'manager';
}

public function isStaff(): bool
{
    return $this->role === 'staff';
}

public function hasBranchAccess(int $branchId): bool
{
    if ($this->isOwner()) {
        return true;
    }

    return $this->employee && $this->employee->branch_id === $branchId;
}
}
