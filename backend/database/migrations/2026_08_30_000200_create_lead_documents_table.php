<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Files submitted with a lead.
 *
 * The file itself lives on the `documents` disk, which is private: nothing is
 * served from public storage, so a Kbis cannot be guessed at by URL.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();

            $table->string('kind');
            /** Name as submitted, kept for the download filename. */
            $table->string('original_name');
            $table->string('path');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            /** Null when the applicant uploaded it; set when an admin did. */
            $table->foreignId('uploaded_by_id')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['lead_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_documents');
    }
};
