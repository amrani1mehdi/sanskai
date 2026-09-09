<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The third sub-service changes hands.
 *
 * Développement Digital used to offer social advertising alongside a website
 * and a logo. It offers migration or reconstruction of an existing site
 * instead, and that took the same slot: one of three choices in a single
 * select, stored in `leads.prestation`.
 *
 * The stored name is renamed rather than left alone. A row saying
 * `campagne_publicitaire` under a service called "Migration ou reconstruction
 * de site web" reads as a bug every time somebody opens the board, and the
 * value is what the enum, the filters and the statistics all key on — leaving
 * it would mean carrying the old name through the whole flow forever.
 *
 * What this cannot do is tell the two apart in history. Leads that genuinely
 * asked about advertising are relabelled as migration enquiries, because
 * nothing in the row distinguishes them. Their date does: anything before this
 * migration ran was an advertising enquiry.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('leads')
            ->where('prestation', 'campagne_publicitaire')
            ->update(['prestation' => 'migration_site']);
    }

    /**
     * Honest in both directions, unlike most value renames: every row holding
     * the new name held the old one before this ran, so putting it back is
     * exact rather than a guess.
     */
    public function down(): void
    {
        DB::table('leads')
            ->where('prestation', 'migration_site')
            ->update(['prestation' => 'campagne_publicitaire']);
    }
};
