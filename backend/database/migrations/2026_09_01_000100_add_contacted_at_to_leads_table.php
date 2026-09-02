<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Has anyone actually rung this person back?
 *
 * `seen_at` already answers "has anyone looked at it", which is not the same
 * question and was standing in for it on the board — a lead someone opened,
 * read and closed without calling looked identical to one that had been dealt
 * with. This is the fact the back office actually works from.
 *
 * A timestamp rather than a boolean, for the same reason `seen_at` is one:
 * "when were they contacted" is worth knowing later, and a flag throws it away.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->timestamp('contacted_at')->nullable()->after('seen_at');

            // The board's first question on every load is which leads are still
            // waiting on a call, so it should not be a table scan.
            $table->index('contacted_at');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['contacted_at']);
            $table->dropColumn('contacted_at');
        });
    }
};
