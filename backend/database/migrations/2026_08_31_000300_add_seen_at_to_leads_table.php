<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * When a lead was first looked at, and by nobody in particular.
 *
 * The back office marked arrivals read in each browser's localStorage, which
 * was right while there was one administrator and wrong the moment there were
 * two: each carried a private idea of what was new, so the same lead was
 * announced to both and chased by both, and neither could tell the other had
 * already picked it up.
 *
 * Deliberately one column on the lead rather than a row per user. "Somebody has
 * seen this" is what the team needs to know; who it was is already in the
 * activity trail, and a join table would answer a question nobody is asking.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            // Indexed: the poll asks how many are still null on every tick.
            $table->timestamp('seen_at')->nullable()->index()->after('status');
        });

        /*
         * Everything already here counts as seen.
         *
         * The old marker treated a browser's first load the same way, for the
         * same reason: announcing every lead in the table as new is noise, not
         * news. Without this both administrators would be greeted by one
         * notification per lead ever received.
         */
        DB::table('leads')->whereNull('seen_at')->update(['seen_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn('seen_at');
        });
    }
};
