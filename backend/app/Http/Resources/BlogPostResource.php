<?php

namespace App\Http\Resources;

use App\Models\BlogPost;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An article as the back office edits it.
 *
 * Every language is sent, because this feeds the editor — which shows all three
 * side by side. The public site gets the narrower shape in
 * `PublicBlogPostResource`, one language deep, so a visitor reading the English
 * article is not also served the French and German source of it.
 */
/** @mixin BlogPost */
class BlogPostResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            /* All three, keyed by locale — the editor shows one field per
               language, the same shape as title and body. */
            'slug' => $this->resource->slugs(),
            'status' => $this->status->value,
            'statusLabel' => $this->status->label(),

            /* Grouped by field rather than flattened to `title_en`: the editor
               renders one tab per locale, and this is the shape it reads. */
            'title' => $this->localeMap('title'),
            'excerpt' => $this->localeMap('excerpt'),
            'body' => $this->localeMap('body'),

            'cover' => $this->when($this->hasCover(), fn () => [
                'name' => $this->cover_name,
                'mimeType' => $this->cover_mime,
                'size' => $this->cover_size,
                /* Addressed by the French slug. The cover endpoint accepts any
                   language's slug, but the editor needs one stable URL and
                   French is the language the site is organised around. */
                'url' => route('api.v1.website.blog.cover', $this->slug_fr),
            ]),

            'publishedAt' => $this->published_at?->toIso8601String(),
            'author' => $this->whenLoaded('author', fn () => [
                'id' => $this->author?->id,
                'name' => $this->author?->name,
            ]),

            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, string|null> */
    private function localeMap(string $field): array
    {
        $out = [];

        foreach (BlogPost::LOCALES as $locale) {
            /*
             * The raw column, not the fallback: the editor has to show which
             * languages are actually empty, or a missing translation looks
             * filled in and gets saved back over the language it borrowed from.
             *
             * Read off `$this->resource` rather than `$this->attributes` — a
             * JsonResource has no attributes of its own, and the model's are
             * protected, so the latter silently yields null for every field.
             */
            $out[$locale] = $this->resource->getAttribute("{$field}_{$locale}");
        }

        return $out;
    }
}
