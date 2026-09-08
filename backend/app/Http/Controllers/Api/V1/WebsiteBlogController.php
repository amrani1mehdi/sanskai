<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\BlogSummaryResource;
use App\Http\Resources\PublicBlogPostResource;
use App\Models\BlogPost;
use App\Support\SiteLocale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The blog as the public site reads it.
 *
 * Open, like the three form endpoints beside it: a visitor has no credential to
 * offer, and nothing here does anything but read published articles. Drafts are
 * unreachable by construction — every query starts from the `published()`
 * scope, so an unpublished slug is a 404 rather than a preview for whoever
 * guesses it.
 */
class WebsiteBlogController extends Controller
{
    /** GET /api/v1/website/blog — the index, newest first, without bodies. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $posts = BlogPost::query()
            ->published()
            ->with('author')
            ->orderByDesc('published_at')
            ->paginate(perPage: min(max($request->integer('perPage', 12), 1), 50));

        return BlogSummaryResource::collection($posts);
    }

    /**
     * GET /api/v1/website/blog/{slug} — one article, bound on its slug.
     *
     * Looked up in the requested language's own slug column, not across all
     * three. `/en/blog/x` must resolve the article whose *English* slug is `x`:
     * matching any column would serve the English page at a French URL, which
     * is two addresses for one document and exactly what per-language slugs
     * exist to avoid.
     */
    public function show(Request $request, string $slug): PublicBlogPostResource
    {
        $locale = SiteLocale::from($request);

        $post = BlogPost::query()
            ->published()
            ->with('author')
            ->where(BlogPost::slugColumn($locale), $slug)
            ->firstOrFail();

        return new PublicBlogPostResource($post);
    }

    /**
     * GET /api/v1/website/blog/{slug}/cover
     *
     * Streams the cover from the private disk.
     *
     * Public on purpose — it is the picture at the top of a published article —
     * but served through the application rather than from public storage, so it
     * needs no `storage:link` symlink to survive a file-copy deployment, and an
     * unpublished article's cover stays unreachable along with the article.
     */
    public function cover(string $slug): StreamedResponse
    {
        /*
         * Any language's slug resolves here, unlike `show()`.
         *
         * A cover is one file shared by all three translations, not a
         * per-language document — so an <img> on the German page pointing at
         * the French slug is correct rather than a duplicate address, and
         * refusing it would only mean emitting three URLs for one picture.
         */
        $post = BlogPost::query()
            ->published()
            ->where(function ($query) use ($slug) {
                foreach (BlogPost::LOCALES as $locale) {
                    $query->orWhere(BlogPost::slugColumn($locale), $slug);
                }
            })
            ->firstOrFail();

        abort_if(! $post->hasCover(), 404, 'Cet article n\'a pas d\'image.');

        $disk = Storage::disk(config('leads.documents_disk'));

        abort_if(! $disk->exists($post->cover_path), 404, 'Image introuvable.');

        // Inline, not a download: this is rendered in an <img>, not saved.
        return $disk->response($post->cover_path, $post->cover_name, [
            'Content-Type' => $post->cover_mime ?: 'application/octet-stream',
            /* A cover only changes when the article does, and the URL carries
               the slug — a day of browser cache saves re-fetching the same
               picture on every view. */
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
