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
        Schema::table('inventory_batch_portions', function (Blueprint $table) {
            // Add a column to store decimal quantities for bulk items, placed after 'label'.
            $table->decimal('quantity', 8, 2)->nullable()->after('label');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_batch_portions', function (Blueprint $table) {
            $table->dropColumn('quantity');
        });
    }
};
