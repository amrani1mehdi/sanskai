<?php

namespace App\Http\Resources;

use App\Models\BlogPost;
use App\Support\SiteLocale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One row of the public blog index.
 *
 * The same shape as a full article minus the body. A listing of twenty
 * articles would otherwise carry twenty complete articles across the wire to
 * render twenty summaries — and the excerpt exists precisely so it does not
 * have to.
 */
/** @mixin BlogPost */
class BlogSummaryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $locale = SiteLocale::from($request);

        return [
            'slug' => $this->slugFor($locale),
            'alternates' => $this->resource->slugs(),
            'title' => $this->translated('title', $locale),
            /* Falls back to the opening of the article when the author left the
               excerpt blank, so a card is never a title over empty space. */
            'excerpt' => $this->summary($locale),
            'coverUrl' => $this->hasCover()
                ? route('api.v1.website.blog.cover', $this->slug_fr)
                : null,
            'publishedAt' => $this->published_at?->toIso8601String(),
            'author' => $this->whenLoaded('author', fn () => $this->author?->name),
        ];
    }

    private function summary(string $locale): ?string
    {
        $excerpt = $this->translated('excerpt', $locale);

        if (filled($excerpt)) {
            return $excerpt;
        }

        $body = $this->translated('body', $locale);

        if (blank($body)) {
            return null;
        }

        /*
         * The body is HTML, so the tags come out before anything is counted or
         * truncated. Two details matter beyond `strip_tags`:
         *
         * Block tags are replaced with a space rather than removed, or
         * "…croissance</h2><p>La plupart…" closes up into "croissanceLa".
         *
         * And entities are decoded, because a card showing "l&#039;entreprise"
         * is the summary leaking its own markup into the page.
         */
        $plain = preg_replace('/<(br|\/p|\/h[1-6]|\/li|\/blockquote|\/div)[^>]*>/i', ' ', $body) ?? $body;
        $plain = strip_tags($plain);
        $plain = html_entity_decode($plain, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return \Illuminate\Support\Str::limit(trim(preg_replace('/\s+/', ' ', $plain) ?? ''), 180);
    }
}
