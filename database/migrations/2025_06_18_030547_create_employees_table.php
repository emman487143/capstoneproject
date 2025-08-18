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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            // This foreign key now correctly points to the users table.
            $table->foreignId('user_id')->nullable()->unique()->constrained('users')->onDelete('set null');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('restrict');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('job_title');
            $table->string('contact_number')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
