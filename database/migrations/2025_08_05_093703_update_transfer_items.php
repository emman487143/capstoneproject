<?php

use App\Enums\Transfers\TransferItemStatus;
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
        Schema::table('transfer_items', function (Blueprint $table) {
            // This column tracks the verification status of each item.
            // It defaults to 'pending' and is updated upon reception.
            $table->string('reception_status')->default(TransferItemStatus::PENDING->value)->after('quantity');

            // This stores the actual quantity received, which may differ from the quantity sent.
            $table->decimal('received_quantity', 10, 2)->nullable()->after('reception_status');

            // A text field for the receiver to add notes about discrepancies (e.g., "damaged in transit").
            $table->text('reception_notes')->nullable()->after('received_quantity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transfer_items', function (Blueprint $table) {
            $table->dropColumn(['reception_status', 'received_quantity', 'reception_notes']);
        });
    }
};
