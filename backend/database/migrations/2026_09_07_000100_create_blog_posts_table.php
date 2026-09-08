<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Articles written in the back office and read on the public site.
 *
 * One row per article, carrying all three languages.
 *
 * The site serves every locale from the same path — the language is a cookie,
 * not a URL segment (see the website's i18n config) — so an article has one
 * slug and three translations of its text, rather than three rows that would
 * each need their own slug and no way to say they are the same piece.
 *
 * The translated fields are spelled out per locale instead of being packed into
 * a JSON column. It costs nine columns, but each one is directly validatable,
 * sortable and searchable, and the set of languages is fixed by the website's
 * own LOCALES const — a fourth would be a front-end change either way.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();

            /*
             * The public URL. Unique across the table and shared by all three
             * languages, because the article is one thing in three languages
             * rather than three articles.
             */
            $table->string('slug')->unique();
            $table->string('status')->default('brouillon');

            // Title and body are required in every language; the excerpt is the
            // listing blurb and falls back to the start of the body when blank.
            $table->string('title_en');
            $table->string('title_fr');
            $table->string('title_de');

            $table->text('excerpt_en')->nullable();
            $table->text('excerpt_fr')->nullable();
            $table->text('excerpt_de')->nullable();

            // Markdown as typed by the author. Rendered to HTML at display time
            // rather than stored as HTML, so the source stays editable and the
            // sanitiser runs on every render instead of once at save.
            $table->longText('body_en');
            $table->longText('body_fr');
            $table->longText('body_de');

            /*
             * Cover image, on the same private disk as lead documents and
             * streamed through the API rather than linked from public storage.
             *
             * `storage:link` is a symlink, and this application is deployed to
             * the VPS by copying files — a symlink is exactly the thing that
             * does not survive that. Streaming needs no link to exist.
             */
            $table->string('cover_path')->nullable();
            $table->string('cover_name')->nullable();
            $table->string('cover_mime')->nullable();
            $table->unsignedBigInteger('cover_size')->nullable();

            /*
             * When it first went out. Set on the first publish and kept through
             * later edits, so correcting a typo does not move an old article
             * back to the top of the list.
             */
            $table->timestamp('published_at')->nullable();

            // Who wrote it. Nullable so removing an administrator does not take
            // their articles down with them.
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            // The public listing reads exactly this: published, newest first.
            $table->index(['status', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_posts');
    }
};
