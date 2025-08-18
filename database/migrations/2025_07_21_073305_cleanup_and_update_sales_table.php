<?php

use App\Enums\SaleStatus;
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
        // Step 1: Clean up obsolete data.
        // Delete sales that are not 'completed' as they are now considered invalid records.
        DB::table('sales')->where('status', '!=', SaleStatus::COMPLETED->value)->delete();

        // Step 2: Modify the table schema to enforce the new business rule.
        Schema::table('sales', function (Blueprint $table) {
            // The status is now always 'completed', so the default can be set accordingly.
            // The comment is updated to reflect the new, simplified state.
            $table->string('status')->default(SaleStatus::COMPLETED->value)->comment('Only completed sales are stored.')->change();
        });
    }

    /**
     * Reverse the migrations.
     * Note: This rollback is a best-effort and restores the previous state.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            // Revert the column to its previous state.
            $table->string('status')->default('pending')->comment('pending, completed, failed')->change();
        });
    }
};
