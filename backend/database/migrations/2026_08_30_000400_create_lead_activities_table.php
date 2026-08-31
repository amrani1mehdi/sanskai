<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The audit trail: who moved a lead, when, and what they touched.
 *
 * Append-only by convention — the API exposes no update or delete for it, so
 * the history of a dossier cannot be quietly rewritten.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('kind');
            /** Already-French, ready to render. */
            $table->string('label');
            $table->foreignId('actor_id')->nullable()
                ->constrained('users')->nullOnDelete();
            /** "Site web" for submissions, the user's name otherwise. */
            $table->string('actor_name');
            $table->timestamps();

            $table->index(['lead_id', 'created_at']);
            $table->index(['kind', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_activities');
    }
};
