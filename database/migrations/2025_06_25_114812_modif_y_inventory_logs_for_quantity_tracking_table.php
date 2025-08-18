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
            // Add a column to link directly to the batch, which is always required.
            $table->foreignId('inventory_batch_id')->after('id')->constrained('inventory_batches')->cascadeOnDelete();

            // Make the existing portion ID nullable, as it only applies to portion-tracked items.
            // Assuming the column is named 'inventory_batch_portion_id'. Please adjust if your column name is different.
            $table->foreignId('batch_portion_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_logs', function (Blueprint $table) {
            // To make this reversible, we must handle potential null values if downgrading.
            // For simplicity, we'll just drop the foreign key and column.
            // A more complex rollback would require a default portion ID.
            $table->dropForeign(['inventory_batch_id']);
            $table->dropColumn('inventory_batch_id');

            // Revert the nullable change. This might fail if there are null values.
            $table->foreignId('batch_portion_id')->nullable(false)->change();
        });
    }
};
