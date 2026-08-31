<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The company identifier the contact form asks for.
 *
 * Nullable because only that form collects it — the financing and development
 * forms identify a company by name and, for financing, by its Kbis.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->string('siren', 32)->nullable()->after('entreprise');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn('siren');
        });
    }
};
