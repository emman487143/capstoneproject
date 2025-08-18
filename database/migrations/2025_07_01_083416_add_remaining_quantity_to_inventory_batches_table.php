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
        Schema::table('inventory_batches', function (Blueprint $table) {
            // Add the missing column to track the remaining quantity of a batch.
            // It should be a decimal to match 'quantity_received'.
            // Placed after 'quantity_received' for logical grouping.
            $table->decimal('remaining_quantity', 10, 2)->after('quantity_received');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_batches', function (Blueprint $table) {
            $table->dropColumn('remaining_quantity');
        });
    }
};
