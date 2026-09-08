import { call } from "./api";
import type { Locale } from "@/lib/i18n/config";
import type { Post, PostStatus, Translated } from "@/lib/blog/types";

/**
 * The blog, as the back office writes it.
 *
 * Goes through the same `/api/crm/...` proxy as everything else, so the token
 * stays in its httpOnly cookie and this file never learns the API's address.
 */

type ApiTranslated = Record<Locale, string | null>;

type ApiPost = {
  id: number;
  slug: ApiTranslated;
  status: PostStatus;
  statusLabel: string;
  title: ApiTranslated;
  excerpt: ApiTranslated;
  body: ApiTranslated;
  cover?: { name: string; mimeType: string; size: number; url: string };
  publishedAt: string | null;
  author?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

/** Nulls become empty strings: a textarea cannot hold null, and every
    consumer would otherwise repeat the same `?? ""`. */
function toTranslated(value: ApiTranslated): Translated {
  return { en: value.en ?? "", fr: value.fr ?? "", de: value.de ?? "" };
}

function toPost(post: ApiPost): Post {
  return {
    id: String(post.id),
    slug: toTranslated(post.slug),
    status: post.status,
    statusLabel: post.statusLabel,
    title: toTranslated(post.title),
    excerpt: toTranslated(post.excerpt),
    body: toTranslated(post.body),
    /*
     * The API answers with its own absolute URL. It is swapped for a path on
     * this origin so the browser never sees the CRM's address — the same reason
     * lead documents are fetched through the proxy rather than linked directly.
     */
    cover: post.cover
      ? { ...post.cover, url: coverUrl(post.id, post.updatedAt) }
      : null,
    publishedAt: post.publishedAt,
    author: post.author?.name ?? null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

/**
 * Where the back office loads a cover from.
 *
 * The authenticated proxy, not the website's `/api/blog/{slug}/cover`. That
 * one serves published articles only — correct for the public site, and the
 * reason attaching an image to a draft used to upload fine and then 404 in
 * the editor that had just uploaded it.
 *
 * Addressed by id: the slug of a draft is still being typed, and it changes
 * under the picture every time the title does.
 *
 * The article's own update time rides along as a query string, so replacing a
 * cover does not leave the editor showing the one it replaced.
 */
export function coverUrl(id: string | number, version?: string): string {
  /* `inline=1` asks the proxy to pass the file through for rendering rather
     than as a download. */
  const suffix = version ? `&v=${encodeURIComponent(version)}` : "";

  return `/api/crm/blog/${encodeURIComponent(String(id))}/cover?inline=1${suffix}`;
}

/** Every article, drafts included. This is the authoring list, not the site. */
export async function fetchPosts(): Promise<Post[]> {
  const posts: Post[] = [];
  let page = 1;

  for (;;) {
    const payload = await call<{
      data: ApiPost[];
      meta?: { current_page: number; last_page: number };
    }>(`blog?page=${page}`);

    posts.push(...payload.data.map(toPost));

    const meta = payload.meta;
    if (!meta || meta.current_page >= meta.last_page) break;
    page += 1;
  }

  return posts;
}

export async function fetchPost(id: string): Promise<Post> {
  const payload = await call<{ data: ApiPost }>(`blog/${id}`);

  return toPost(payload.data);
}

/** What the editor sends. Everything optional, so a save can be partial. */
export type PostEdits = Partial<{
  slug: Translated;
  status: PostStatus;
  title: Translated;
  excerpt: Translated;
  body: Translated;
  publishedAt: string | null;
  cover: File | null;
  removeCover: boolean;
}>;

/**
 * Packs an edit for the wire.
 *
 * Always multipart, whether or not there is a file. Mixing the two encodings —
 * JSON when there is no picture, multipart when there is — means two shapes to
 * keep in step on both sides for no benefit, and Laravel reads the nested
 * `title[fr]` names out of a form body just as happily as out of JSON.
 */
function toFormData(edits: PostEdits): FormData {
  const body = new FormData();

  for (const field of ["slug", "title", "excerpt", "body"] as const) {
    const value = edits[field];
    if (!value) continue;

    for (const [locale, text] of Object.entries(value)) {
      body.set(`${field}[${locale}]`, text);
    }
  }

  if (edits.status !== undefined) body.set("status", edits.status);
  if (edits.publishedAt !== undefined) {
    body.set("publishedAt", edits.publishedAt ?? "");
  }
  if (edits.cover) body.set("cover", edits.cover);
  // Laravel's `boolean` rule reads "1"/"0", not "true"/"false".
  if (edits.removeCover) body.set("removeCover", "1");

  return body;
}

export async function createPost(edits: PostEdits): Promise<Post> {
  const payload = await call<{ data: ApiPost }>("blog", {
    method: "POST",
    // No Content-Type header: fetch sets the multipart boundary itself, and
    // naming it by hand makes the body unreadable at the other end.
    body: toFormData(edits),
  });

  return toPost(payload.data);
}

/** POST, not PATCH — PHP only fills $_FILES for a POST, so a multipart PATCH
    would arrive with no cover attached. */
export async function updatePost(id: string, edits: PostEdits): Promise<Post> {
  const payload = await call<{ data: ApiPost }>(`blog/${id}`, {
    method: "POST",
    body: toFormData(edits),
  });

  return toPost(payload.data);
}

export async function deletePost(id: string): Promise<void> {
  await call<void>(`blog/${id}`, { method: "DELETE" });
}
