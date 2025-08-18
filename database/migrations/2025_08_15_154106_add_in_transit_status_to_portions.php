<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    DB::statement("ALTER TABLE inventory_batch_portions MODIFY status ENUM('unused', 'used', 'spoiled', 'wasted', 'transferred', 'adjusted', 'in_transit') DEFAULT 'unused'");
}

public function down()
{
    DB::statement("ALTER TABLE inventory_batch_portions MODIFY status ENUM('unused', 'used', 'spoiled', 'wasted', 'transferred', 'adjusted') DEFAULT 'unused'");
}
};
