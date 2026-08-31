"use client";

import { useId, useRef, useState } from "react";
import { FileText, Plus, TriangleAlert, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_UPLOAD_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

/**
 * The same set as extensions.
 *
 * Browsers do not always report a MIME type — a file dragged out of another
 * application, or one the operating system has no handler for, arrives with
 * `type` empty. Judging those on the name is the difference between an invoice
 * being accepted and being refused as the wrong kind of file.
 */
const ACCEPTED_UPLOAD_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

function isAccepted(file: File): boolean {
  if (ACCEPTED_UPLOAD_TYPES.includes(file.type)) return true;

  const name = file.name.toLowerCase();

  return ACCEPTED_UPLOAD_EXTENSIONS.some((ext) => name.endsWith(ext));
}

type FileUploadProps = {
  /** The action, e.g. "Upload ID document" — this is the button's own text. */
  label: string;
  /** Marks the field as not required, so nobody is left guessing. */
  optionalLabel: string;
  hint: string;
  removeLabel: string;
  tooLargeMessage: string;
  wrongTypeMessage: string;
  files: File[];
  onChange: (files: File[]) => void;
  /** Bank statements arrive as one file per month, so some fields take several. */
  multiple?: boolean;
  addMoreLabel?: string;
  maxFiles?: number;
  /** A message the API returned against this slot, e.g. a rejected file type. */
  serverError?: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Optional document upload: a drop zone that is also a button.
 *
 * Nothing is transmitted — there is no backend yet — so the chosen files are
 * held in the form's state and validated client-side only. Whatever accepts
 * these later has to re-check type and size itself; a browser check keeps
 * honest people from wasting an upload, nothing more.
 */
export function FileUpload({
  label,
  optionalLabel,
  hint,
  removeLabel,
  tooLargeMessage,
  wrongTypeMessage,
  files,
  onChange,
  multiple = false,
  addMoreLabel,
  maxFiles = 12,
  serverError,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const accept = (candidates: File[]) => {
    if (candidates.some((file) => !isAccepted(file))) {
      setError(wrongTypeMessage);
      return;
    }
    if (candidates.some((file) => file.size > MAX_UPLOAD_BYTES)) {
      setError(tooLargeMessage);
      return;
    }

    setError(null);
    onChange(
      multiple ? [...files, ...candidates].slice(0, maxFiles) : candidates.slice(0, 1),
    );
  };

  const removeAt = (index: number) => {
    setError(null);
    onChange(files.filter((_, i) => i !== index));
    // Without this the same file cannot be picked again after removing it.
    if (inputRef.current) inputRef.current.value = "";
  };

  const shown = error ?? serverError;

  const open = () => inputRef.current?.click();
  const full = multiple ? files.length >= maxFiles : files.length > 0;

  /*
   * Dropping is handled on the wrapper rather than the button: the button is
   * hidden once the slot is full, and a drop aimed at the file list — or just
   * short of the button — would otherwise be handled by the browser, which
   * navigates away to the file and loses the rest of the form.
   */
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);

    const dropped = Array.from(event.dataTransfer.files ?? []);
    if (dropped.length) accept(dropped);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        // Moving between children fires dragleave on the one being left, so
        // only a pointer that has actually left the field counts.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={[...ACCEPTED_UPLOAD_TYPES, ...ACCEPTED_UPLOAD_EXTENSIONS].join(",")}
        className="sr-only"
        aria-describedby={shown ? errorId : undefined}
        aria-label={label}
        onChange={(event) => {
          const chosen = Array.from(event.target.files ?? []);
          if (chosen.length) accept(chosen);
          // Cleared so picking the same file again still fires a change event;
          // after a rejection that is exactly what someone tries next.
          event.target.value = "";
        }}
      />

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3"
            >
              <FileText className="size-4 shrink-0 text-accent" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">
                  {file.name}
                </span>
                <span className="block text-xs tabular-nums text-muted-foreground">
                  {formatSize(file.size)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`${removeLabel}: ${file.name}`}
                title={removeLabel}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-danger"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!full ? (
        <button
          type="button"
          onClick={open}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border border-dashed px-4 py-3.5 text-left transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            files.length > 0 && "mt-2",
            dragging
              ? "border-accent bg-accent/10"
              : "border-border bg-background hover:border-accent/40 hover:bg-secondary/40",
          )}
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-accent/10">
            {files.length > 0 ? (
              <Plus className="size-4 text-accent" aria-hidden />
            ) : (
              <Upload className="size-4 text-accent" aria-hidden />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              {files.length > 0 ? (addMoreLabel ?? label) : label}
            </span>
            <span className="block text-xs text-muted-foreground">{hint}</span>
          </span>
          <span className="ml-auto shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.625rem] uppercase tracking-wide text-muted-foreground">
            {optionalLabel}
          </span>
        </button>
      ) : null}

      {shown ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-center gap-2 text-xs text-danger"
        >
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          {shown}
        </p>
      ) : null}
    </div>
  );
}
