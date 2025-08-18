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
          Schema::create('inventory_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->onDelete('cascade');
            $table->unsignedInteger('batch_number');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->string('source')->nullable();
            // CORRECTED: Changed from unsignedInteger to decimal to support both
            // whole numbers (for portions) and decimal values (for quantities like kg/liters).
            $table->decimal('quantity_received', 10, 2);
            $table->decimal('unit_cost', 8, 2)->nullable();
            $table->date('expiration_date')->nullable();
            $table->timestamps();
            $table->unique(['branch_id', 'inventory_item_id', 'batch_number'], 'batch_branch_item_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_batches');
    }
};
