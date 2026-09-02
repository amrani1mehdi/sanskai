<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Contact messages join the pipeline.
 *
 * They ran a two-state track of their own — "Non répondu" and "Répondu" — on
 * the reasoning that "Qualifié" and "Approuvé" mean nothing on a question
 * someone asked. In practice a contact message is a lead like any other: it
 * gets read, the person gets called, and it either turns into work or it does
 * not. Splitting the board in two made you look in two places for the same job.
 *
 * `repondu` therefore stops being a status the board can show. Any lead still
 * holding it would land in no column at all and quietly disappear from the one
 * screen that lists leads, so it is mapped to `a_examiner` — labelled
 * "Contacté", which is what "Répondu" meant: somebody has been back to them.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('leads')
            ->where('status', 'repondu')
            ->update(['status' => 'a_examiner']);
    }

    /**
     * Not reversible in any honest way.
     *
     * A lead that was "Répondu" and one that has been contacted are the same
     * value now, so going back would have to guess which of the two each row
     * used to be. Contact leads are returned to the start of the pipeline
     * instead, which is wrong for some of them but not silently wrong.
     */
    public function down(): void
    {
        DB::table('leads')
            ->where('service', 'contact')
            ->where('status', 'a_examiner')
            ->update(['status' => 'repondu']);
    }
};
