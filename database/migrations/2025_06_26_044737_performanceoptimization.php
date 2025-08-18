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
            // Add named composite indexes for reliable dropping
            $table->index(['current_branch_id', 'status'], 'portions_branch_status_index');
            $table->index(['inventory_batch_id', 'status'], 'portions_batch_status_index');
        });

        Schema::table('inventory_logs', function (Blueprint $table) {
            // Use the correct column name 'batch_portion_id' and name the index
            $table->index(['batch_portion_id', 'created_at'], 'logs_portion_created_at_index');
            $table->index(['action', 'created_at'], 'logs_action_created_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_batch_portions', function (Blueprint $table) {
            // Drop indexes by their given names
            $table->dropIndex('portions_branch_status_index');
            $table->dropIndex('portions_batch_status_index');
        });

        Schema::table('inventory_logs', function (Blueprint $table) {
            // Drop indexes by their given names
            $table->dropIndex('logs_portion_created_at_index');
            $table->dropIndex('logs_action_created_at_index');
        });
    }
};
