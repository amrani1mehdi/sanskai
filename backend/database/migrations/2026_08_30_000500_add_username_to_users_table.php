<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A login name alongside the email.
 *
 * The admin is handed a username and a password on installation and signs in
 * with either that or the email — Filament's own login is on email, and this
 * keeps both working rather than migrating one to the other.
 *
 * Nullable, because existing rows have no username and a unique NOT NULL column
 * cannot be added to a populated table without inventing values.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable()->unique()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
        });
    }
};
