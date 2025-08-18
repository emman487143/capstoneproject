<?php

use App\Enums\Transfers\TransferStatus;
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
        Schema::create('transfers', function (Blueprint $table) {
            $table->id();

            // Core Details
            $table->foreignId('source_branch_id')->constrained('branches')->onDelete('cascade');
            $table->foreignId('destination_branch_id')->constrained('branches')->onDelete('cascade');
            $table->foreignId('sending_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('receiving_user_id')->nullable()->constrained('users')->onDelete('set null');

            // Status & Timestamps
            $table->string('status')->default(TransferStatus::PENDING->value);
            $table->timestamp('sent_at');
            $table->timestamp('received_at')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transfers');
    }
};
