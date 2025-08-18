<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('inventory_logs', function (Blueprint $table) {
            // Change the 'action' column to a string to accommodate longer enum values.
            // The ->change() method requires the doctrine/dbal package.
            $table->string('action')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_logs', function (Blueprint $table) {
            // This is a best-effort reversal. The original type isn't known for sure,
            // but we'll revert to a short string. If you used enum, this would be more complex.
            $table->string('action', 50)->change();
        });
    }
};
