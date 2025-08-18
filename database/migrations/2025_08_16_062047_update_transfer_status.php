<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update the enum type to include 'rejected'
        // For PostgreSQL
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TYPE transfer_status ADD VALUE 'rejected' AFTER 'cancelled'");
        } 
        // For MySQL, we need to modify the column
        else {
            DB::statement("ALTER TABLE transfers MODIFY COLUMN status ENUM('pending', 'completed', 'cancelled', 'rejected') NOT NULL DEFAULT 'pending'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // For MySQL, we can revert the column
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE transfers MODIFY COLUMN status ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending'");
        }
        // For PostgreSQL, we can't remove enum values, so we just document it
        else {
            // We cannot remove enum values from PostgreSQL
            // A downgrade would require a full table rebuild
        }
    }
};