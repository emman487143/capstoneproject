<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update the status enum to include all the new values
        DB::statement("ALTER TABLE inventory_batch_portions MODIFY status ENUM(
            'unused', 'used', 'spoiled', 'wasted', 'transferred', 'adjusted', 'in_transit',
            'stolen', 'missing', 'damaged', 'expired', 'consumed', 'restored'
        ) DEFAULT 'unused'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to the previous enum values
        DB::statement("ALTER TABLE inventory_batch_portions MODIFY status ENUM(
            'unused', 'used', 'spoiled', 'wasted', 'transferred', 'adjusted', 'in_transit'
        ) DEFAULT 'unused'");
    }
};
