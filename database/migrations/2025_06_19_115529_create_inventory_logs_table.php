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
         Schema::create('inventory_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_portion_id')->constrained('inventory_batch_portions')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('action', ['CREATED', 'DEDUCTED_SALE', 'MARKED_SPOILED', 'MARKED_WASTE', 'TRANSFER_OUT', 'TRANSFER_IN', 'TRANSFER_DAMAGED', 'ADJUSTED']);
            $table->json('details')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_logs');
    }
};
