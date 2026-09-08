"use client";

/**
 * Articles — the list, and the way into writing one.
 *
 * Deliberately not the leads board. A lead is a row you triage against five
 * others and drag between columns; an article is a document you open and work
 * on for an hour. So this is a list of documents, one row each, rather than a
 * second kanban with the same furniture around it.
 *
 * Not a table either, which is what it was first. A table earns its columns by
 * letting you compare values down them, and there is nothing here to compare:
 * a back office publishing four articles a month shows four identical dates, a
 * repeated author and one status. Set as columns those facts end up far from
 * the title they describe; set as a row with its own icons they stay together.
 *
 * The cover picture does most of the work of making a row findable. Someone
 * looking for the article about payment terms recognises its photograph well
 * before they finish reading a title, which is why the thumbnail leads the row
 * rather than sitting somewhere in it as decoration.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  ImageIcon,
  Link2,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { ApiError } from "@/lib/crm/api";
import { deletePost, fetchPosts } from "@/lib/crm/blog";
import { formatDate } from "@/lib/crm/format";
import type { Post } from "@/lib/blog/types";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { cn } from "@/lib/utils";

/*
 * The French field, falling back to any language that is filled in.
 *
 * The back office is French, but an article drafted in English first should be
 * a row you can read and open rather than a blank one.
 */
function title(post: Post) {
  return post.title.fr || post.title.en || post.title.de || "Sans titre";
}

function slug(post: Post) {
  return post.slug.fr || post.slug.en || post.slug.de;
}

function excerpt(post: Post) {
  return post.excerpt.fr || post.excerpt.en || post.excerpt.de || "";
}

type State = "publie" | "programme" | "brouillon";

/**
 * Which of three states a row is in.
 *
 * The API stores two — published or not — but an article can be marked
 * published with a date in the future, which holds it back until then.
 * Showing that as plain "Publié" has the author refreshing the live site
 * looking for a page that is not there yet, so it is pulled out as its own
 * state here rather than left for the reader to work out from the date.
 */
function stateOf(post: Post): State {
  if (post.status !== "publie") return "brouillon";

  const scheduled =
    post.publishedAt !== null && new Date(post.publishedAt) > new Date();

  return scheduled ? "programme" : "publie";
}

type Filter = "tous" | "publie" | "brouillon";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "publie", label: "Publiés" },
  { id: "brouillon", label: "Brouillons" },
];

export function BlogWorkspace() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("tous");

  /*
   * Reloading is a counter rather than a callback the button and the effect
   * both call.
   *
   * The fetch lives inside the effect, so nothing sets state synchronously
   * from an effect body — and "load again" becomes a value change rather than
   * a second code path that could drift from the one that runs on mount.
   */
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const rows = await fetchPosts();

        if (cancelled) return;

        setPosts(rows);
        setError(null);
      } catch (cause) {
        if (cancelled) return;

        setPosts([]);
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Impossible de charger les articles.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  /*
   * No polling here, unlike the board.
   *
   * The board polls because leads arrive on their own, from the public site,
   * while you are looking at something else. Nothing writes an article except
   * the person in this screen, so a list that re-fetched every fifteen seconds
   * would only ever be confirming what the reader already did.
   */

  const drafts = posts?.filter((p) => p.status !== "publie").length ?? 0;

  /*
   * Searching and filtering happen here rather than at the API.
   *
   * `fetchPosts` already walks every page into memory — the back office holds
   * tens of articles, not thousands — so a round trip per keystroke would buy
   * nothing and cost the responsiveness that makes a search box worth having.
   */
  const shown = useMemo(() => {
    if (!posts) return [];

    const needle = query.trim().toLowerCase();

    return posts.filter((post) => {
      if (filter === "publie" && post.status !== "publie") return false;
      if (filter === "brouillon" && post.status === "publie") return false;

      if (!needle) return true;

      return (
        title(post).toLowerCase().includes(needle) ||
        slug(post).toLowerCase().includes(needle) ||
        (post.author ?? "").toLowerCase().includes(needle)
      );
    });
  }, [posts, query, filter]);

  async function confirmDelete() {
    if (!pending) return;

    setDeleting(true);

    try {
      await deletePost(pending.id);
      setPosts((current) => current?.filter((p) => p.id !== pending.id) ?? null);
      setPending(null);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "La suppression a échoué.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3.5 lg:px-6">
        <div>
          <h1 className="font-display text-lg font-bold text-foreground">
            Articles
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {posts === null
              ? "Chargement…"
              : posts.length === 0
                ? "Aucun article"
                : `${posts.length} article${posts.length === 1 ? "" : "s"}${
                    drafts > 0
                      ? `, dont ${drafts} brouillon${drafts === 1 ? "" : "s"}`
                      : ""
                  }`}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            aria-label="Recharger la liste"
            title="Recharger la liste"
            className="flex size-9 items-center justify-center border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <RefreshCw size={15} aria-hidden />
          </button>

          <Link
            href="/admin/blog/new"
            className="flex items-center gap-1.5 bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus size={15} aria-hidden />
            Nouvel article
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 lg:px-6">
        {error && (
          <p className="mb-4 flex items-start gap-2 border border-danger/25 border-l-2 border-l-danger bg-danger/[0.06] px-3.5 py-3 text-[13px] text-danger">
            {error}
          </p>
        )}

        {/* The toolbar is worth its space once there is more than a screenful
            to look through, and only gets in the way before then. */}
        {posts !== null && posts.length > 3 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search
                size={14}
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un article"
                aria-label="Rechercher un article"
                className="w-full border border-input bg-card py-2 pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
            </div>

            <div className="flex items-center border border-border">
              {FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  aria-pressed={filter === option.id}
                  className={cn(
                    "px-3.5 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                    filter === option.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {posts === null ? (
          <Skeleton />
        ) : posts.length === 0 ? (
          <Empty />
        ) : shown.length === 0 ? (
          <NoMatches
            onClear={() => {
              setQuery("");
              setFilter("tous");
            }}
          />
        ) : (
          /* Rows share one border rather than each carrying its own: stacked
             separate boxes at full width read as four unrelated panels, and
             the gaps between them are the widest thing on the screen. */
          <ul className="border border-border bg-card">
            {shown.map((post) => (
              <Row key={post.id} post={post} onDelete={() => setPending(post)} />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title="Supprimer cet article ?"
        description={
          pending
            ? `« ${title(pending)} » sera retiré du site et de la base. Cette action est définitive.`
            : ""
        }
        confirmLabel={deleting ? "Suppression…" : "Supprimer"}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

function Row({ post, onDelete }: { post: Post; onDelete: () => void }) {
  const state = stateOf(post);
  const name = title(post);
  const summary = excerpt(post);

  return (
    <li className="group relative border-b border-border transition-colors last:border-b-0 hover:bg-secondary/50 focus-within:bg-secondary/50">
      <div className="flex items-start gap-4 px-4 py-3.5 lg:px-5">
        <Thumb post={post} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <h2 className="min-w-0 flex-1">
              <Link
                href={`/admin/blog/${post.id}`}
                /* Stretched over the row by the pseudo-element, so the whole
                   row opens the article while the link's accessible name
                   stays the title rather than everything the row contains. */
                className="text-[15px] leading-snug font-semibold text-foreground before:absolute before:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {name}
              </Link>
            </h2>

            <StatePill state={state} />
          </div>

          {summary && (
            <p className="mt-1.5 line-clamp-2 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
              {summary}
            </p>
          )}

          {/* Each fact gets its own icon rather than a column heading. The
              headings were the same four words above every screenful of rows,
              and a calendar beside a date says it in a twelfth of the room. */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <Link2 size={12} aria-hidden className="shrink-0" />
              <span className="truncate font-mono">/blog/{slug(post)}</span>
            </span>

            <span className="flex items-center gap-1.5">
              <CalendarDays size={12} aria-hidden className="shrink-0" />
              {post.publishedAt ? formatDate(post.publishedAt) : "Pas de date"}
            </span>

            {post.author && (
              <span className="flex items-center gap-1.5">
                <User size={12} aria-hidden className="shrink-0" />
                {post.author}
              </span>
            )}
          </div>
        </div>

        {/* `relative` lifts the actions above the stretched link, which covers
            the whole row and would otherwise swallow every click. */}
        <div className="relative flex shrink-0 items-center gap-1">
          <Action
            href={`/admin/blog/${post.id}`}
            label={`Modifier « ${name} »`}
            icon={<PenLine size={15} aria-hidden />}
          />

          {/* Only where there is something to look at: a draft has no page on
              the site yet, and a link to one would open the 404. */}
          {state === "publie" && (
            <Action
              href={`/blog/${slug(post)}`}
              external
              label={`Voir « ${name} » sur le site`}
              icon={<ExternalLink size={15} aria-hidden />}
            />
          )}

          <button
            type="button"
            onClick={onDelete}
            aria-label={`Supprimer « ${name} »`}
            title="Supprimer"
            className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger focus-visible:bg-danger/10 focus-visible:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Trash2 size={15} aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}

function Action({
  href,
  label,
  icon,
  external,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:bg-secondary focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {icon}
    </Link>
  );
}

/**
 * The cover, or a stand-in for one.
 *
 * The placeholder is the same size and shape as a real thumbnail rather than
 * being left out, so a list where some articles have pictures and some do not
 * still lines up down its left edge.
 */
function Thumb({ post }: { post: Post }) {
  return (
    <div className="hidden h-16 w-24 shrink-0 overflow-hidden border border-border bg-secondary sm:block">
      {post.cover ? (
        /* A plain <img>: the source is an API route on this origin that
           streams bytes, which is not something next/image can size. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover.url}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="flex size-full items-center justify-center">
          <ImageIcon
            size={18}
            className="text-muted-foreground/50"
            aria-hidden
          />
        </span>
      )}
    </div>
  );
}

/**
 * Published, held back, or still being written.
 *
 * Three states, two of them coloured. Green is what this back office already
 * spends on an outcome and amber on the one thing asking for something, so a
 * draft is the row that catches the eye across a list — which is the row with
 * work left in it. Scheduled stays neutral: it is finished, just not yet due.
 */
function StatePill({ state }: { state: State }) {
  const styles: Record<
    State,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    publie: {
      label: "Publié",
      className: "border-success/25 bg-success/[0.08] text-success",
      icon: <CheckCircle2 size={12} aria-hidden />,
    },
    programme: {
      label: "Programmé",
      className: "border-border bg-secondary text-muted-foreground",
      icon: <Clock3 size={12} aria-hidden />,
    },
    brouillon: {
      label: "Brouillon",
      className: "border-new/35 bg-new-soft text-foreground",
      icon: <PenLine size={12} aria-hidden />,
    },
  };

  const { label, className, icon } = styles[state];

  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-[11px] font-medium",
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}

/** Grey rows while the list loads, so the page does not jump when it lands. */
function Skeleton() {
  return (
    <ul className="border border-border bg-card" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex items-start gap-4 border-b border-border px-4 py-3.5 last:border-b-0 lg:px-5"
        >
          <div className="hidden h-16 w-24 shrink-0 animate-pulse bg-secondary sm:block motion-reduce:animate-none" />
          <div className="flex-1 space-y-2.5 py-1">
            <div className="h-3.5 w-1/3 animate-pulse bg-secondary motion-reduce:animate-none" />
            <div className="h-3 w-2/3 animate-pulse bg-secondary motion-reduce:animate-none" />
            <div className="h-3 w-1/4 animate-pulse bg-secondary motion-reduce:animate-none" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-border bg-card py-16 text-center">
      <span className="flex size-11 items-center justify-center bg-secondary">
        <FileText size={20} className="text-muted-foreground" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">
          Aucun article pour l’instant
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Le premier article que vous publierez apparaîtra sur le site.
        </p>
      </div>
      <Link
        href="/admin/blog/new"
        className="mt-1 flex items-center gap-1.5 bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Plus size={15} aria-hidden />
        Écrire le premier
      </Link>
    </div>
  );
}

function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-border bg-card py-14 text-center">
      <span className="flex size-11 items-center justify-center bg-secondary">
        <Search size={18} className="text-muted-foreground" aria-hidden />
      </span>
      <p className="text-sm text-muted-foreground">
        Aucun article ne correspond à cette recherche.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="border border-border px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Tout afficher
      </button>
    </div>
  );
}
