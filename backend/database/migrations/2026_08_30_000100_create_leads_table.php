<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Website leads.
 *
 * One table for both services: they share identity, company and tracking
 * columns, and the handful that differ are nullable rather than a second table
 * plus a join on every list query.
 *
 * Service, sub-service and status are enum columns, not lookup tables — the
 * values are owned by the code that renders them and never edited by an admin.
 * The responsable is a `users` row, so no separate owners table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();

            $table->string('service');
            // Développement only.
            $table->string('prestation')->nullable();
            $table->string('status')->default('nouveau');

            $table->foreignId('assigned_to_id')->nullable()
                ->constrained('users')->nullOnDelete();

            // Identity — both forms collect all four.
            $table->string('nom');
            $table->string('prenom');
            $table->string('email');
            $table->string('telephone')->nullable();

            // Company.
            $table->string('entreprise');
            // Drives the six-month eligibility rule; the age is always derived.
            $table->date('date_creation')->nullable();
            $table->string('adresse')->nullable();
            $table->string('code_postal')->nullable();
            $table->string('ville')->nullable();

            // Financing specifics. Amounts stay as submitted, in the applicant's
            // own words, with the parsed value alongside for sorting and totals.
            $table->string('chiffre_affaire')->nullable();
            $table->unsignedBigInteger('chiffre_affaire_cents')->nullable();
            $table->string('montant')->nullable();
            $table->unsignedBigInteger('montant_cents')->nullable();
            $table->string('code_commercial')->nullable();

            // Web presence.
            $table->boolean('site_web')->nullable();
            $table->string('site_web_url')->nullable();
            $table->boolean('reseaux')->nullable();
            $table->string('reseaux_ou')->nullable();

            $table->text('message')->nullable();

            // What the eligibility rules said at submission, so a later change
            // to the thresholds cannot rewrite history.
            $table->boolean('eligible_age')->nullable();
            $table->boolean('eligible_revenue')->nullable();

            $table->timestamps();

            // The list is filtered on these and always sorted newest first.
            $table->index(['service', 'status']);
            $table->index(['status', 'created_at']);
            $table->index('assigned_to_id');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
