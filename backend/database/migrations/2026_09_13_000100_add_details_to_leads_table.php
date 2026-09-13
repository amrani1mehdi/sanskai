<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The answers on the trade-show client sheet that have no column of their own.
 *
 * Sector, company age, headcount, the contact's role and landline, the needs
 * ticked, and — when financing is one of them — why and how soon. One JSON
 * column rather than eleven: they belong to one form, nothing filters or sorts
 * on them, and a column per tick box would leave every other lead carrying
 * eleven nulls.
 *
 * Nullable, and null on every lead that did not come from that sheet.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->json('details')->nullable()->after('message');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn('details');
        });
    }
};
