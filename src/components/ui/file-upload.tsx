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
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const accept = (candidates: File[]) => {
    if (candidates.some((file) => !ACCEPTED_UPLOAD_TYPES.includes(file.type))) {
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

  const open = () => inputRef.current?.click();
  const full = multiple ? files.length >= maxFiles : files.length > 0;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={ACCEPTED_UPLOAD_TYPES.join(",")}
        className="sr-only"
        aria-describedby={error ? errorId : undefined}
        aria-label={label}
        onChange={(event) => {
          const chosen = Array.from(event.target.files ?? []);
          if (chosen.length) accept(chosen);
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
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const dropped = Array.from(event.dataTransfer.files ?? []);
            if (dropped.length) accept(dropped);
          }}
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

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-center gap-2 text-xs text-danger"
        >
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
