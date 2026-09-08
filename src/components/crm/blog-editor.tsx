"use client";

/**
 * Writing an article, in three languages.
 *
 * The shape of this screen follows from the one decision behind the table: an
 * article is one row carrying every translation. So the language is a tab, not
 * a separate document — you switch between English, French and German without
 * leaving the page, and one Save writes all three.
 *
 * The left half is a sheet, not a form. Title, summary and body are the three
 * parts of one article, and boxing each of them separately, with a label over
 * every box, made writing a piece feel like filling in a tax return. They are
 * stacked on a single white surface at the sizes they will be read at, so what
 * the author types looks roughly like what the site will show.
 *
 * The right half is everything that is true of the article rather than of one
 * of its translations — what still needs doing, where it will live, what
 * picture it carries. In one column those sat under the body, so setting a
 * cover meant scrolling past a finished article to reach it.
 *
 * The body is a rich-text editor rather than markdown. It was markdown first,
 * with a preview pane beside it, and the preview was the tell: needing to show
 * someone a rendering of what they just typed means the thing they typed did
 * not look like what they meant. The person writing these runs a business and
 * should not have to learn a syntax to make a word bold.
 *
 * It stores HTML, and the public page renders that HTML through
 * `renderArticle` — the same sanitiser, on every render, whatever the editor
 * happened to emit.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  ExternalLink,
  ImageIcon,
  Link2,
  Loader2,
  PenLine,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { ApiError } from "@/lib/crm/api";
import { createPost, fetchPost, updatePost } from "@/lib/crm/blog";
import { RichTextEditor } from "@/components/crm/rich-text-editor";
import { slugify } from "@/lib/blog/slug";
import { emptyTranslated, type Translated } from "@/lib/blog/types";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/** The heading over one block of the settings column. */
const panelLabel =
  "flex items-center gap-1.5 border-b border-border px-4 py-2.5 font-mono text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase";

/** Full names, because "DE" alone does not say which tab is unfinished. */
const LOCALE_NAMES: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  de: "Deutsch",
};

type Draft = {
  /* One address per language: the site puts the locale in the path now, so a
     German article at a French slug would tell a search engine, in the one
     place it looks hardest, that the page is French. */
  slug: Translated;
  title: Translated;
  excerpt: Translated;
  body: Translated;
  published: boolean;
};

/**
 * Whether the address still follows the title.
 *
 * A new article's URL is written from the French title as it is typed, so the
 * author can see the address they are about to publish rather than discovering
 * it afterwards. The moment they edit the field by hand that stops — a slug
 * someone chose is not something to overwrite on the next keystroke.
 *
 * An existing article never follows: changing a published URL silently would
 * break every link to it that already exists.
 */
type SlugMode = "follows-title" | "chosen";

const EMPTY: Draft = {
  slug: emptyTranslated(),
  title: emptyTranslated(),
  excerpt: emptyTranslated(),
  body: emptyTranslated(),
  published: false,
};

/**
 * Words in a body, counted off the HTML the editor emits.
 *
 * Tags become spaces rather than being deleted, or "…croissance</p><p>La
 * plupart…" closes up into one word that was two.
 */
function countWords(html: string): number {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();

  return text ? text.split(/\s+/).length : 0;
}

/**
 * Whether a body actually holds anything.
 *
 * The editor’s empty document is "<p></p>" rather than "", so asking the
 * string whether it is blank answers no for an article nobody has written a
 * word of. The words are counted instead — and a pasted picture counts too,
 * being content that happens not to be a word.
 */
function hasBody(html: string): boolean {
  return countWords(html) > 0 || /<img\b/i.test(html);
}

export function BlogEditor({ id }: { id?: string }) {
  const router = useRouter();
  const isNew = id === undefined;

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [locale, setLocale] = useState<Locale>("fr");

  /* A new article follows its title; an existing one keeps the URL it was
     published at. */
  const [slugMode, setSlugMode] = useState<SlugMode>(
    isNew ? "follows-title" : "chosen",
  );

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  /* The cover has three states, and they are not one value: keeping what is
     stored, replacing it with a chosen file, or taking it off. */
  const [existingCover, setExistingCover] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNew) return;

    let cancelled = false;

    void (async () => {
      try {
        const post = await fetchPost(id);

        if (cancelled) return;

        setDraft({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          body: post.body,
          published: post.status === "publie",
        });
        setExistingCover(post.cover?.url ?? null);
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Impossible de charger cet article.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  /*
   * The chosen file, as a URL the <img> can show.
   *
   * Revoked when it changes or the editor closes: an object URL pins the whole
   * file in memory until it is released, and picking four covers in a row
   * without this leaks all four.
   */
  const coverPreview = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile],
  );

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const setText = useCallback(
    (part: "title" | "excerpt" | "body") => (value: string) => {
      setDraft((current) => {
        const next = {
          ...current,
          [part]: { ...current[part], [locale]: value },
        };

        /* Each language's address follows its own title while nobody has
           overridden it — which is the point of per-language slugs: the German
           URL should read as German rather than borrowing the French words. */
        if (part === "title" && slugMode === "follows-title") {
          next.slug = { ...current.slug, [locale]: slugify(value) };
        }

        return next;
      });
    },
    [locale, slugMode],
  );

  /** Which tabs still have an empty title or body. */
  const incomplete = useMemo(
    () =>
      LOCALES.filter(
        (code) => !draft.title[code].trim() || !hasBody(draft.body[code]),
      ),
    [draft.title, draft.body],
  );

  const words = useMemo(
    () => countWords(draft.body[locale]),
    [draft.body, locale],
  );

  async function save() {
    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      const edits = {
        title: draft.title,
        excerpt: draft.excerpt,
        body: draft.body,
        status: draft.published ? ("publie" as const) : ("brouillon" as const),
        cover: coverFile,
        removeCover: removeCover && !coverFile,
        /* Sent as a whole map. A language whose field is blank goes up empty
           and the API derives that one from its own title — so an author who
           only touched the French tab still gets a German address. */
        slug: draft.slug,
      };

      if (isNew) {
        const created = await createPost(edits);

        /* Replace rather than push: the editor for a brand-new article and the
           editor for the article it just became are the same screen, and Back
           should return to the list, not to an empty form that would create a
           second one. */
        router.replace(`/admin/blog/${created.id}`);

        return;
      }

      const saved = await updatePost(id, edits);

      setExistingCover(saved.cover?.url ?? null);
      setCoverFile(null);
      setRemoveCover(false);
      if (coverInput.current) coverInput.current.value = "";
      setSavedAt(new Date().toISOString());
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        setFieldErrors(cause.errors);
      } else {
        setError("L’enregistrement a échoué.");
      }
    } finally {
      setSaving(false);
    }
  }

  function chooseCover(file: File | null) {
    setCoverFile(file);
    if (file) setRemoveCover(false);
  }

  if (loading) return <Loading />;

  const shownCover = coverPreview ?? (removeCover ? null : existingCover);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/admin/blog"
            aria-label="Retour aux articles"
            title="Retour aux articles"
            className="flex size-8 shrink-0 items-center justify-center border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft size={15} aria-hidden />
          </Link>

          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold text-foreground">
              {isNew ? "Nouvel article" : "Modifier l’article"}
            </h1>
            {/* The French title under the heading, so a back office holding
                twenty articles says which one is open without the author
                having to read the form to find out. */}
            {!isNew && draft.title.fr.trim() && (
              <p className="truncate text-xs text-muted-foreground">
                {draft.title.fr}
              </p>
            )}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {savedAt && !saving && (
            <span className="flex items-center gap-1.5 text-[11px] text-success">
              <Check size={13} aria-hidden />
              Enregistré
            </span>
          )}

          {/* Publishing is part of Save rather than a second button: it is a
              property of the article, and pairing them means one write instead
              of "save, then publish" as two chances to half-finish.

              Two labelled choices rather than a checkbox — "Publié" unticked
              does not say what the article is instead, and "Brouillon" is the
              word the list and the site both use for it. */}
          <div
            role="group"
            aria-label="État de l’article"
            className="flex items-center border border-border"
          >
            {[
              { on: false, text: "Brouillon", icon: PenLine },
              { on: true, text: "Publié", icon: CheckCircle2 },
            ].map(({ on, text, icon: Icon }) => (
              <button
                key={text}
                type="button"
                onClick={() =>
                  setDraft((current) => ({ ...current, published: on }))
                }
                aria-pressed={draft.published === on}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                  draft.published === on
                    ? on
                      ? "bg-success/[0.10] text-success"
                      : "bg-new-soft text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon size={13} aria-hidden />
                {text}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex items-center gap-1.5 bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {saving && (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            )}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </header>

      {error && (
        <p className="mx-4 mt-3 flex items-start gap-2 border border-danger/25 border-l-2 border-l-danger bg-danger/[0.06] px-3.5 py-3 text-[13px] text-danger lg:mx-6">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {/* The writing on the left, what the article is on the right. Stacked
          below `xl`, where a 20rem column beside the body would leave neither
          of them wide enough to work in. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-auto xl:flex-row xl:overflow-hidden">
        <div className="min-w-0 flex-1 px-4 py-4 lg:px-6 xl:overflow-auto">
          {/* Language tabs, as an underline rather than three filled blocks:
              the tab bar is a place marker, and a solid ink block for it
              competes with the one solid ink button on the screen.

              The dot marks a language still missing a title or a body — the
              one thing that stops the article being publishable in all three,
              and invisible otherwise until the API refuses it. */}
          <div
            role="tablist"
            aria-label="Langue"
            className="flex items-center gap-1 border-b border-border"
          >
            {LOCALES.map((code) => {
              const active = code === locale;
              const missing = incomplete.includes(code);

              return (
                <button
                  key={code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setLocale(code)}
                  className={cn(
                    "-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                    active
                      ? "border-foreground font-semibold text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {LOCALE_NAMES[code]}
                  <span
                    aria-label={missing ? "incomplet" : "complet"}
                    className={cn(
                      "size-1.5 shrink-0",
                      missing ? "bg-new" : "bg-success/60",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {/* One sheet. The three fields are the three parts of an article, at
              the sizes they will be read at, rather than three labelled boxes
              that happen to be stacked. */}
          <div className="mt-4 border border-border bg-card">
            <div className="px-5 pt-5 pb-4">
              <label htmlFor="title" className="sr-only">
                Titre en {LOCALE_NAMES[locale]}
              </label>
              {/* Set at the size of a title rather than of a form field: it is
                  the one line of this screen that ends up as a heading on the
                  site, and typing it into a 13px input gives no sense of how
                  it will read there. */}
              <input
                id="title"
                value={draft.title[locale]}
                onChange={(event) => setText("title")(event.target.value)}
                placeholder="Titre de l’article"
                className="w-full border-0 bg-transparent p-0 font-display text-2xl leading-tight font-bold text-foreground placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              />
              <FieldError errors={fieldErrors[`title.${locale}`]} />

              <label htmlFor="excerpt" className="sr-only">
                Résumé en {LOCALE_NAMES[locale]}
              </label>
              <textarea
                id="excerpt"
                rows={2}
                value={draft.excerpt[locale]}
                onChange={(event) => setText("excerpt")(event.target.value)}
                placeholder="Résumé — la phrase affichée sur la liste des articles. Laissé vide, le début de l’article est utilisé."
                className="mt-3 w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-muted-foreground placeholder:text-muted-foreground/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              />
              <FieldError errors={fieldErrors[`excerpt.${locale}`]} />
            </div>

            {/* The body.

                No preview pane beside it any more: the editor renders the
                article's own styles as you type, so a second copy of the same
                text would be showing you what you are already looking at. The
                `prose-article` class on the editing surface is the same one the
                public page uses. */}
            <div className="border-t border-border">
              {/* Keyed on the locale so switching tabs mounts a fresh editor
                  with its own history — otherwise Undo would walk back out of
                  the German text into edits made to the French. */}
              <RichTextEditor
                key={locale}
                bare
                value={draft.body[locale]}
                onChange={setText("body")}
                placeholder="Écrivez votre article ici."
              />
            </div>

            <div className="border-t border-border px-5 py-2.5">
              <p className="font-mono text-[11px] text-muted-foreground">
                {words === 0
                  ? "Article vide"
                  : `${words} mot${words === 1 ? "" : "s"} · ${Math.max(
                      1,
                      Math.round(words / 200),
                    )} min de lecture`}
              </p>
            </div>
          </div>

          <div className="mt-2 px-1">
            <FieldError errors={fieldErrors[`body.${locale}`]} />
          </div>
        </div>

        {/* Beside the writing rather than under it: these belong to the
            article, not to the translation open in the tabs, and they are the
            things an author sets once and then wants to see are still set. */}
        <aside className="shrink-0 space-y-4 px-4 pb-4 lg:px-6 xl:w-80 xl:overflow-auto xl:border-l xl:border-border xl:px-5 xl:py-4">
          <Checklist
            draft={draft}
            locale={locale}
            hasCover={shownCover !== null}
            incomplete={incomplete}
          />

          <section className="border border-border bg-card">
            <h2 className={panelLabel}>
              <Link2 size={12} aria-hidden />
              Adresse
            </h2>

            <div className="p-4">
              <label htmlFor="slug" className="mb-1.5 block text-xs font-medium text-foreground">
                {LOCALE_NAMES[locale]}
                {isNew && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    (facultatif)
                  </span>
                )}
              </label>

              <div className="flex items-center border border-input bg-card focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
                <span className="shrink-0 py-2 pl-2.5 font-mono text-[11px] text-muted-foreground">
                  {localePrefix(locale)}/blog/
                </span>
                <input
                  id="slug"
                  value={draft.slug[locale]}
                  onChange={(event) => {
                    /* Typing here takes the address off the title for good.
                       Slugified as it is typed, so the field can only ever hold
                       something that is actually valid in a URL. */
                    setSlugMode("chosen");
                    setDraft((c) => ({
                      ...c,
                      slug: { ...c.slug, [locale]: slugify(event.target.value) },
                    }));
                  }}
                  placeholder={isNew ? "depuis le titre" : ""}
                  className="w-full min-w-0 bg-transparent py-2 pr-2.5 font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>

              {/* Back to following the title. Only worth offering once the
                  author has overridden it and there is a title to go back
                  to — otherwise it is a button that does nothing. */}
              {isNew && slugMode === "chosen" && draft.title[locale].trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setSlugMode("follows-title");
                    setDraft((c) => ({
                      ...c,
                      slug: { ...c.slug, [locale]: slugify(c.title[locale]) },
                    }));
                  }}
                  className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <RefreshCw size={11} aria-hidden />
                  Reprendre depuis le titre
                </button>
              )}

              <FieldError errors={fieldErrors[`slug.${locale}`]} />

              {/* A link once there is a live page to open, plain text until
                  then: an anchor to an article nobody has published yet is a
                  404 dressed up as a preview. */}
              {draft.slug[locale] && !isNew && draft.published ? (
                <a
                  href={`${localePrefix(locale)}/blog/${draft.slug[locale]}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed break-all text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <ExternalLink size={11} className="mt-0.5 shrink-0" aria-hidden />
                  {localePrefix(locale)}/blog/{draft.slug[locale]}
                </a>
              ) : (
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {draft.slug[locale]
                    ? `L’article sera à ${localePrefix(locale)}/blog/${draft.slug[locale]}`
                    : "Une adresse par langue — celle de l’onglet ouvert."}
                </p>
              )}
            </div>
          </section>

          <section className="border border-border bg-card">
            <h2 className={panelLabel}>
              <ImageIcon size={12} aria-hidden />
              Image de couverture
            </h2>

            <div className="p-4">
              {shownCover ? (
                <div className="flex flex-col gap-2">
                  {/* A plain <img>: the source is an API route on this origin
                      whose dimensions are not known ahead of time, which is
                      exactly the case next/image cannot optimise anyway. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shownCover}
                    alt=""
                    className="aspect-[16/10] w-full border border-border object-cover"
                  />

                  <div className="flex items-center gap-2">
                    <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 border border-border px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
                      <RefreshCw size={12} aria-hidden />
                      Remplacer
                      <input
                        ref={coverInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          chooseCover(event.target.files?.[0] ?? null)
                        }
                        className="sr-only"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setRemoveCover(true);
                        if (coverInput.current) coverInput.current.value = "";
                      }}
                      className="flex items-center gap-1.5 border border-border px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <Trash2 size={12} aria-hidden />
                      Retirer
                    </button>
                  </div>
                </div>
              ) : (
                <CoverDrop inputRef={coverInput} onChoose={chooseCover} />
              )}

              <FieldError errors={fieldErrors.cover} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

/**
 * What is still missing, before the API is the one to say so.
 *
 * The three required things are a title, a body and an address, and until this
 * was on the screen the only way to find out one was blank was to press Save
 * and read a validation error. The optional two are listed as well, marked as
 * optional: an article with no cover is publishable but looks poor in the list,
 * which is worth knowing before rather than after.
 */
function Checklist({
  draft,
  locale,
  hasCover,
  incomplete,
}: {
  draft: Draft;
  locale: Locale;
  hasCover: boolean;
  incomplete: Locale[];
}) {
  const items = [
    { text: "Titre", done: draft.title[locale].trim() !== "" },
    { text: "Contenu", done: hasBody(draft.body[locale]) },
    { text: "Adresse", done: draft.slug[locale].trim() !== "" },
    {
      text: "Résumé",
      done: draft.excerpt[locale].trim() !== "",
      optional: true,
    },
    { text: "Image de couverture", done: hasCover, optional: true },
  ];

  return (
    <section className="border border-border bg-card">
      <h2 className={panelLabel}>
        <CheckCircle2 size={12} aria-hidden />
        {LOCALE_NAMES[locale]}
      </h2>

      <ul className="p-4 text-[12px]">
        {items.map((item) => (
          <li key={item.text} className="flex items-center gap-2 py-1">
            {item.done ? (
              <CheckCircle2
                size={13}
                className="shrink-0 text-success"
                aria-hidden
              />
            ) : (
              <Circle
                size={13}
                className={cn(
                  "shrink-0",
                  item.optional ? "text-border" : "text-new",
                )}
                aria-hidden
              />
            )}

            <span
              className={cn(item.done ? "text-foreground" : "text-muted-foreground")}
            >
              {item.text}
            </span>

            {item.optional && !item.done && (
              <span className="ml-auto text-[10px] text-muted-foreground">
                facultatif
              </span>
            )}
          </li>
        ))}
      </ul>

      {incomplete.length > 0 && (
        <p className="border-t border-border px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          {incomplete.length === LOCALES.length
            ? "Aucune langue n’est complète."
            : `À compléter : ${incomplete.map((c) => LOCALE_NAMES[c]).join(", ")}.`}
        </p>
      )}
    </section>
  );
}

/**
 * The empty cover slot.
 *
 * Shaped like the picture it is asking for rather than being a one-line
 * button, and it takes a dropped file: choosing a cover is a thing done with a
 * photograph already open in another window.
 */
function CoverDrop({
  inputRef,
  onChoose,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChoose: (file: File | null) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        onChoose(event.dataTransfer.files?.[0] ?? null);
      }}
      className={cn(
        "flex aspect-[16/10] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed text-center text-[11px] transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
        over
          ? "border-foreground bg-secondary text-foreground"
          : "border-border text-muted-foreground hover:border-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <ImageIcon size={20} aria-hidden />
      Choisir une image
      <span className="text-[10px] text-muted-foreground">
        ou la déposer ici — JPG, PNG, WebP
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => onChoose(event.target.files?.[0] ?? null)}
        className="sr-only"
      />
    </label>
  );
}

/** The shape of the editor, greyed, while the article is fetched. */
function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden" aria-busy>
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3 lg:px-6">
        <div className="size-8 animate-pulse bg-secondary motion-reduce:animate-none" />
        <div className="h-4 w-40 animate-pulse bg-secondary motion-reduce:animate-none" />
        <div className="ml-auto h-9 w-32 animate-pulse bg-secondary motion-reduce:animate-none" />
      </div>

      <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground lg:px-6">
        <Loader2 size={14} className="animate-spin" aria-hidden />
        Chargement de l’article…
      </p>
    </div>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;

  return (
    <p className="mt-1.5 flex items-start gap-2 border border-danger/25 border-l-2 border-l-danger bg-danger/[0.06] px-3 py-2 text-[11px] leading-relaxed text-danger">
      {errors[0]}
    </p>
  );
}

/**
 * The language's URL prefix, as the public site builds it.
 *
 * French is unprefixed, so this is "" for French and "/en" or "/de" otherwise —
 * shown beside the slug field so the author sees the whole address rather than
 * the half of it they are typing.
 */
function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}
