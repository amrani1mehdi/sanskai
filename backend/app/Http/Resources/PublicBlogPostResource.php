<?php

namespace App\Http\Resources;

use App\Models\BlogPost;
use App\Support\SiteLocale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A full article as a visitor reads it: one language, already chosen.
 *
 * The locale is read off the request rather than taken as a constructor
 * argument, because `JsonResource::collection()` builds its members with the
 * resource alone and would drop anything extra.
 *
 * `alternates` carries every language's slug. The article page needs them to
 * emit `hreflang` links — which is how a search engine learns that three URLs
 * are one article in three languages rather than three competing thin pages.
 * Without it each translation looks like an unrelated document.
 */
/** @mixin BlogPost */
class PublicBlogPostResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $locale = SiteLocale::from($request);

        return [
            'slug' => $this->slugFor($locale),
            'alternates' => $this->resource->slugs(),
            'title' => $this->translated('title', $locale),
            'excerpt' => $this->translated('excerpt', $locale),
            /* HTML as the editor stored it. The website sanitises it on every
               render — see `renderArticle` there. */
            'body' => $this->translated('body', $locale),
            'coverUrl' => $this->hasCover()
                ? route('api.v1.website.blog.cover', $this->slug_fr)
                : null,
            'publishedAt' => $this->published_at?->toIso8601String(),
            'author' => $this->whenLoaded('author', fn () => $this->author?->name),
        ];
    }
}
