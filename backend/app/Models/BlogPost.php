<?php

namespace App\Models;

use App\Enums\PostStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * An article, in three languages.
 *
 * The locale-suffixed columns are addressed through `translated()` rather than
 * read directly, so the fallback rule lives in one place: an article always has
 * every language filled in, but a row written before a language existed, or one
 * repaired by hand in the database, should still render something rather than
 * an empty page.
 */
#[Fillable([
    'slug_en', 'slug_fr', 'slug_de', 'status',
    'title_en', 'title_fr', 'title_de',
    'excerpt_en', 'excerpt_fr', 'excerpt_de',
    'body_en', 'body_fr', 'body_de',
    'published_at',
])]
class BlogPost extends Model
{
    /** The languages the website serves, mirroring its own LOCALES const. */
    public const LOCALES = ['en', 'fr', 'de'];

    /** Fallback order when a locale's column is empty. */
    private const FALLBACK = ['fr', 'en', 'de'];

    protected function casts(): array
    {
        return [
            'status' => PostStatus::class,
            'published_at' => 'datetime',
            'cover_size' => 'integer',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /* ---------------------------------------------------------------------- */
    /* Reading                                                                 */
    /* ---------------------------------------------------------------------- */

    /**
     * One translated field, with a fallback.
     *
     * `$field` is a bare column stem — 'title', 'excerpt', 'body' — never
     * request data: it is concatenated into a column name, so anything that
     * reached it from outside would be choosing which column to read.
     */
    public function translated(string $field, string $locale): ?string
    {
        $value = $this->attributes["{$field}_{$locale}"] ?? null;

        if (filled($value)) {
            return $value;
        }

        foreach (self::FALLBACK as $fallback) {
            $candidate = $this->attributes["{$field}_{$fallback}"] ?? null;

            if (filled($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    public function isPublished(): bool
    {
        return $this->status === PostStatus::Publie;
    }

    public function hasCover(): bool
    {
        return filled($this->cover_path);
    }

    /* ---------------------------------------------------------------------- */
    /* Scopes                                                                  */
    /* ---------------------------------------------------------------------- */

    /**
     * What the public site may see.
     *
     * A future `published_at` holds an article back, so an article can be
     * finished and dated ahead without a scheduler to release it — the date
     * arriving is the release.
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query
            ->where('status', PostStatus::Publie->value)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    /* ---------------------------------------------------------------------- */
    /* Slugs                                                                   */
    /* ---------------------------------------------------------------------- */

    /**
     * A URL-safe slug that no other article holds in this language.
     *
     * Uniqueness is per language, because the languages are separate URL
     * spaces: `/blog/x` is the French article and `/en/blog/x` the English one,
     * so two articles only collide when they claim the same slug in the *same*
     * language.
     *
     * Collisions are resolved by suffixing rather than rejected: two articles
     * legitimately called "Nos résultats 2026" is an editorial decision, not a
     * mistake to push back to the author as a validation error.
     */
    public static function uniqueSlug(
        string $source,
        string $locale,
        ?int $ignoreId = null,
    ): string {
        $column = self::slugColumn($locale);
        $base = Str::slug($source);

        // Str::slug() empties out on a title with no latin characters at all.
        if ($base === '') {
            $base = 'article';
        }

        $slug = $base;
        $suffix = 2;

        while (
            static::query()
                ->where($column, $slug)
                ->when($ignoreId, fn (Builder $q) => $q->whereKeyNot($ignoreId))
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    /**
     * The slug column for a language.
     *
     * Goes through the whitelist rather than interpolating whatever was passed:
     * the result is used as a column name in a query, so an unchecked value
     * would be choosing which column to search.
     */
    public static function slugColumn(string $locale): string
    {
        if (! in_array($locale, self::LOCALES, true)) {
            throw new \InvalidArgumentException("Unknown locale: {$locale}");
        }

        return "slug_{$locale}";
    }

    /** This article's slug in one language. */
    public function slugFor(string $locale): ?string
    {
        return $this->getAttribute(self::slugColumn($locale));
    }

    /**
     * Every language's slug, keyed by locale.
     *
     * The public site needs all three on any single article: they are what the
     * `hreflang` links point at, which is how a search engine learns that three
     * URLs are one article in three languages rather than three thin pages.
     *
     * @return array<string, string|null>
     */
    public function slugs(): array
    {
        $out = [];

        foreach (self::LOCALES as $locale) {
            $out[$locale] = $this->slugFor($locale);
        }

        return $out;
    }
}
