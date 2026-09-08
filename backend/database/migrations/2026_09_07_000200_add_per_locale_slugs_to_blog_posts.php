<?php

use App\Models\BlogPost;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * One address per language.
 *
 * An article had a single slug, shared by all three translations, because the
 * site served every language from the same path — the language was a cookie, so
 * there was only ever one URL to name.
 *
 * The site now puts the language in the path (`/blog/…`, `/en/blog/…`,
 * `/de/blog/…`), which makes the shared slug the weakest part of the URL: a
 * German article reading `/de/blog/financer-votre-croissance` tells a search
 * engine, in the one place it looks hardest, that the page is French.
 *
 * The old column is kept until the data is copied across, then dropped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            foreach (BlogPost::LOCALES as $locale) {
                // Nullable for now — filled from `slug` below, then tightened.
                $table->string("slug_{$locale}")->nullable()->after('slug');
            }
        });

        /*
         * Every existing article keeps its slug in all three languages.
         *
         * Not a translation — nobody can invent a German URL for an article
         * written before the column existed. It keeps every current link
         * working, and the author can set a real one the next time they open
         * the article.
         */
        foreach (DB::table('blog_posts')->select('id', 'slug')->get() as $post) {
            DB::table('blog_posts')->where('id', $post->id)->update([
                'slug_en' => $post->slug,
                'slug_fr' => $post->slug,
                'slug_de' => $post->slug,
            ]);
        }

        Schema::table('blog_posts', function (Blueprint $table) {
            foreach (BlogPost::LOCALES as $locale) {
                $table->string("slug_{$locale}")->nullable(false)->change();
                /*
                 * Unique per column, not across all three. `/blog/x` and
                 * `/en/blog/x` are different URLs, so two articles sharing a
                 * string in different languages collide with nothing — only two
                 * articles claiming the same French slug would.
                 */
                $table->unique("slug_{$locale}");
            }

            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }

    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('id');
        });

        // The French slug is the one the site is organised around.
        DB::statement('UPDATE blog_posts SET slug = slug_fr');

        Schema::table('blog_posts', function (Blueprint $table) {
            $table->string('slug')->nullable(false)->change();
            $table->unique('slug');

            foreach (BlogPost::LOCALES as $locale) {
                $table->dropUnique(["blog_posts_slug_{$locale}_unique"]);
                $table->dropColumn("slug_{$locale}");
            }
        });
    }
};
