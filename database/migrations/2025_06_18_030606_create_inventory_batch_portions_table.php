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
         Schema::create('inventory_batch_portions', function (Blueprint $table) {
           $table->id();
            $table->foreignId('inventory_batch_id')->constrained('inventory_batches')->onDelete('cascade');
            $table->foreignId('current_branch_id')->constrained('branches')->onDelete('cascade');
            $table->integer('portion_number')->unsigned();
            $table->string('label')->unique();
             $table->enum('status', ['unused', 'used', 'spoiled', 'wasted', 'transferred', 'adjusted'])->default('unused');
            $table->timestamps();

            // A portion number should be unique for a given batch.
            // We provide a custom, shorter index name to avoid MySQL's length limit.
            $table->unique(['inventory_batch_id', 'portion_number'], 'batch_portion_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_batch_portions');
    }
};
