<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PostStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreBlogPostRequest;
use App\Http\Requests\Api\UpdateBlogPostRequest;
use App\Http\Resources\BlogPostResource;
use App\Models\BlogPost;
use App\Support\CoverStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Articles, from the back office.
 *
 * Behind the same admin gate as the leads: whoever can read the CRM can write
 * the blog. There is no editor role to separate the two, and inventing one for
 * a site with two administrators would be a permission system nobody asked for.
 */
class BlogPostController extends Controller
{
    public function __construct(private readonly CoverStore $covers) {}

    /**
     * GET /api/v1/blog
     *
     * Newest first, drafts included — this is the authoring list, not the site.
     * Ordered by `created_at` rather than `published_at` so drafts, which have
     * no publication date yet, do not all pile up at one end.
     */
    public function index(): AnonymousResourceCollection
    {
        return BlogPostResource::collection(
            BlogPost::query()->with('author')->latest()->paginate(50),
        );
    }

    /** GET /api/v1/blog/{post} */
    public function show(BlogPost $post): BlogPostResource
    {
        return new BlogPostResource($post->load('author'));
    }

    /**
     * POST /api/v1/blog
     *
     * Multipart when a cover comes with it, JSON when it does not.
     */
    public function store(StoreBlogPostRequest $request): JsonResponse
    {
        $data = $request->validated();

        try {
            $post = DB::transaction(function () use ($request, $data) {
                $post = new BlogPost;

                $this->fillTranslations($post, $data);
                $this->fillSlugs($post, $data);

                $post->status = PostStatus::from($data['status'] ?? PostStatus::Brouillon->value);
                $post->author_id = $request->user()?->id;

                $this->applyPublicationDate($post, $data);

                if ($request->hasFile('cover')) {
                    $this->covers->put($post, $request->file('cover'));
                }

                $post->save();

                return $post;
            });
        } catch (Throwable $e) {
            // The row is gone; take the cover file with it.
            $this->covers->discard();

            throw $e;
        }

        Log::info('Article créé', [
            'id' => $post->id,
            'slug' => $post->slug,
            'by' => $request->user()?->id,
        ]);

        return response()->json(
            ['data' => new BlogPostResource($post->load('author'))],
            201,
        );
    }

    /**
     * PATCH /api/v1/blog/{post}
     *
     * Only what was sent is applied, so saving one language tab does not post
     * the other two back over themselves.
     */
    public function update(UpdateBlogPostRequest $request, BlogPost $post): BlogPostResource
    {
        $data = $request->validated();

        try {
            DB::transaction(function () use ($request, $post, $data) {
                $this->fillTranslations($post, $data);
                $this->fillSlugs($post, $data);

                if (array_key_exists('status', $data)) {
                    $post->status = PostStatus::from($data['status']);
                }

                $this->applyPublicationDate($post, $data);

                /* Order matters: a request carrying both a new file and the
                   remove flag is asking to replace, so the upload wins. */
                if ($request->hasFile('cover')) {
                    $this->covers->put($post, $request->file('cover'));
                } elseif ($request->boolean('removeCover')) {
                    $this->covers->remove($post);
                }

                $post->save();
            });
        } catch (Throwable $e) {
            $this->covers->discard();

            throw $e;
        }

        return new BlogPostResource($post->fresh()->load('author'));
    }

    /**
     * DELETE /api/v1/blog/{post}
     *
     * Takes the cover with it. Nothing else references the file, so leaving it
     * behind would only grow the disk.
     */
    public function destroy(Request $request, BlogPost $post): Response
    {
        $path = $post->cover_path;
        $slug = $post->slug;

        $post->delete();

        if (filled($path)) {
            Storage::disk(config('leads.documents_disk'))->delete($path);
        }

        Log::info('Article supprimé', ['slug' => $slug, 'by' => $request->user()?->id]);

        return response()->noContent();
    }

    /**
     * GET /api/v1/blog/{post}/cover
     *
     * The same picture the website serves, for people who are allowed to see
     * it before anybody else is.
     *
     * The public route refuses an unpublished article on purpose — a cover
     * should not be reachable before the article it belongs to. But the back
     * office was reading covers through that same route, so an author who
     * attached an image to a draft uploaded it successfully and then watched
     * their own editor 404 on it. This one is behind the admin gate and asks
     * no questions about status.
     *
     * Addressed by id rather than slug: the editor knows the id of the article
     * it has open, and a draft's slug can still change under it.
     */
    public function cover(BlogPost $post): StreamedResponse
    {
        abort_if(! $post->hasCover(), 404, 'Cet article n\'a pas d\'image.');

        $disk = Storage::disk(config('leads.documents_disk'));

        abort_if(! $disk->exists($post->cover_path), 404, 'Image introuvable.');

        // Inline, not a download: this is rendered in an <img>, not saved.
        return $disk->response($post->cover_path, $post->cover_name, [
            'Content-Type' => $post->cover_mime ?: 'application/octet-stream',
            /* No public caching. The editor re-reads this the moment a cover
               is replaced, and the URL it uses carries the article's update
               time — but a draft's picture has no business sitting in a
               shared cache either way. */
            'Cache-Control' => 'private, max-age=0, must-revalidate',
        ]);
    }

    /* ---------------------------------------------------------------------- */

    /**
     * Copies the per-locale text onto the row.
     *
     * The column name is built from `BlogPost::LOCALES`, never from the keys
     * the request sent, so a crafted payload cannot name a column of its own.
     *
     * @param  array<string, mixed>  $data
     */
    private function fillTranslations(BlogPost $post, array $data): void
    {
        foreach (['title', 'excerpt', 'body'] as $field) {
            foreach (BlogPost::LOCALES as $locale) {
                if (! array_key_exists($locale, $data[$field] ?? [])) {
                    continue;
                }

                $post->{"{$field}_{$locale}"} = $data[$field][$locale];
            }
        }
    }

    /**
     * Sets each language's slug.
     *
     * A slug the editor sent is used; one it left out is derived from that
     * language's own title — which is the point of per-language addresses, so
     * the German URL reads as German rather than borrowing the French words.
     *
     * Falls back through the other languages only when a title is genuinely
     * missing, so an article half-written in one tab still gets a usable
     * address rather than "article-2".
     *
     * @param  array<string, mixed>  $data
     */
    private function fillSlugs(BlogPost $post, array $data): void
    {
        foreach (BlogPost::LOCALES as $locale) {
            $sent = $data['slug'][$locale] ?? null;

            if (filled($sent)) {
                $post->{BlogPost::slugColumn($locale)} = BlogPost::uniqueSlug(
                    $sent,
                    $locale,
                    $post->id,
                );

                continue;
            }

            // On an update, a slug nobody sent stays exactly as it was: a
            // published URL is not something to regenerate behind the author.
            if ($post->exists && filled($post->slugFor($locale))) {
                continue;
            }

            $source = $data['title'][$locale]
                ?? $post->getAttribute("title_{$locale}")
                ?? $data['title']['fr']
                ?? $post->title_fr
                ?? 'article';

            $post->{BlogPost::slugColumn($locale)} = BlogPost::uniqueSlug(
                $source,
                $locale,
                $post->id,
            );
        }
    }

    /**
     * Keeps `published_at` in step with the status.
     *
     * An explicit date always wins — that is how an article gets backdated, or
     * dated ahead to hold it back. Otherwise publishing stamps now, and only if
     * the article has never been published: re-publishing something that was
     * taken down keeps the day it originally went out.
     *
     * @param  array<string, mixed>  $data
     */
    private function applyPublicationDate(BlogPost $post, array $data): void
    {
        if (array_key_exists('publishedAt', $data)) {
            $post->published_at = $data['publishedAt'];

            return;
        }

        if ($post->status === PostStatus::Publie && $post->published_at === null) {
            $post->published_at = now();
        }
    }
}
