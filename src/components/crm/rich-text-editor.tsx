"use client";

/**
 * The article body editor.
 *
 * A real rich-text surface rather than markdown with a preview beside it: the
 * person writing these is running a business, not learning a syntax, and
 * "why is my text full of asterisks" is not a question a back office should
 * ever make somebody ask.
 *
 * What it emits is HTML, and what the public page renders is that HTML put
 * through `renderArticle`. The toolbar is deliberately narrow — headings,
 * emphasis, lists, quote, link — because every button here is a tag the
 * sanitiser has to allow, and an article does not need a font picker.
 */

import { useCallback, useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  bare,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Drop the surrounding box, for a caller that already draws one. */
  bare?: boolean;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        /* h1 is the article's title, rendered by the page itself. Offering it
           in the body would produce two top-level headings on one document —
           which the sanitiser rewrites anyway, so the button would lie. */
        heading: { levels: [2, 3, 4] },
        /* StarterKit ships its own link. Left on, both register under the same
           name and the one that wins is not necessarily the one configured
           below — which is where the `javascript:` protocol guard lives. */
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        /* The editor's own guard. `renderArticle` is still the one that
           decides what actually reaches a reader, but there is no reason to
           let a `javascript:` href into the stored value in the first place. */
        protocols: ["http", "https", "mailto"],
      }),
      /* Puts the text on the empty node itself, which is what `attr()` in the
         stylesheet can actually read — an attribute on the wrapper is
         invisible to a pseudo-element on the paragraph inside it. */
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    /* Tiptap renders in the browser. Left to hydrate, the server pass and the
       first client pass disagree and React throws. */
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose-article min-h-[26rem] max-w-none px-4 py-3 outline-none",
          // The editor is the field, so it carries the field's focus ring.
          "focus:outline-none",
        ),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  /*
   * Re-fill the editor when the article or the language tab changes.
   *
   * Without this, switching from French to German leaves the French text in
   * place — Tiptap keeps its own document and does not watch `content` after
   * the first render. Guarded on a real difference, or every keystroke would
   * write the value back and put the caret at the top.
   */
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.getHTML() === value) return;

    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previous = editor.getAttributes("link").href as string | undefined;
    /*
     * `window.prompt` is a blocking browser dialog, which is exactly what is
     * wanted for one short string here — but it is the only one in this
     * application, so it is worth saying why: a bespoke popover for "paste a
     * URL" is three components and a focus trap to replace something the
     * browser already does correctly.
     */
    const url = window.prompt("Adresse du lien", previous ?? "https://");

    // Cancelled — leave whatever was there alone.
    if (url === null) return;

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();

      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          "min-h-[28rem] bg-card px-4 py-3 text-sm text-muted-foreground",
          !bare && "border border-input",
        )}
      >
        Chargement de l’éditeur…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-card",
        !bare &&
          "border border-input focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground",
      )}
    >
      {/* Sticky, so the formatting buttons are still there two thousand
          words down. Opaque rather than transparent, or the article
          scrolls underneath them. */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-card px-2 py-2">
        <Tool
          editor={editor}
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          label="Gras"
        >
          <Bold size={14} aria-hidden />
        </Tool>
        <Tool
          editor={editor}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          label="Italique"
        >
          <Italic size={14} aria-hidden />
        </Tool>
        <Tool
          editor={editor}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          label="Barré"
        >
          <Strikethrough size={14} aria-hidden />
        </Tool>

        <Divider />

        <Tool
          editor={editor}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          label="Titre"
        >
          <Heading2 size={14} aria-hidden />
        </Tool>
        <Tool
          editor={editor}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
          label="Sous-titre"
        >
          <Heading3 size={14} aria-hidden />
        </Tool>

        <Divider />

        <Tool
          editor={editor}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          label="Liste à puces"
        >
          <List size={14} aria-hidden />
        </Tool>
        <Tool
          editor={editor}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          label="Liste numérotée"
        >
          <ListOrdered size={14} aria-hidden />
        </Tool>
        <Tool
          editor={editor}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          label="Citation"
        >
          <Quote size={14} aria-hidden />
        </Tool>

        <Divider />

        <Tool
          editor={editor}
          onClick={setLink}
          active={editor.isActive("link")}
          label="Lien"
        >
          <LinkIcon size={14} aria-hidden />
        </Tool>
        <Tool
          editor={editor}
          onClick={() => editor.chain().focus().unsetLink().run()}
          active={false}
          disabled={!editor.isActive("link")}
          label="Retirer le lien"
        >
          <Unlink size={14} aria-hidden />
        </Tool>

        <span className="ml-auto flex items-center gap-0.5">
          <Tool
            editor={editor}
            onClick={() => editor.chain().focus().undo().run()}
            active={false}
            disabled={!editor.can().undo()}
            label="Annuler"
          >
            <Undo2 size={14} aria-hidden />
          </Tool>
          <Tool
            editor={editor}
            onClick={() => editor.chain().focus().redo().run()}
            active={false}
            disabled={!editor.can().redo()}
            label="Rétablir"
          >
            <Redo2 size={14} aria-hidden />
          </Tool>
        </span>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-4 w-px bg-border" />;
}

function Tool({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  editor: Editor;
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-7 w-7 items-center justify-center transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        disabled && "opacity-35 hover:bg-transparent hover:text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
