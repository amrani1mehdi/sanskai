"use client";

import { useId, useRef, useState } from "react";
import { FileText, Paperclip, TriangleAlert, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_UPLOAD_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

type FileUploadProps = {
  label: string;
  /** Marks the field as not required, so nobody is left guessing. */
  optionalLabel: string;
  hint: string;
  chooseLabel: string;
  removeLabel: string;
  tooLargeMessage: string;
  wrongTypeMessage: string;
  file: File | null;
  onChange: (file: File | null) => void;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Optional document upload: a drop zone that is also a button.
 *
 * Nothing is transmitted — there is no backend yet — so the chosen file is
 * held in the form's state and validated client-side only. Whatever accepts
 * these later has to re-check type and size itself; a browser check keeps
 * honest people from wasting an upload, nothing more.
 */
export function FileUpload({
  label,
  optionalLabel,
  hint,
  chooseLabel,
  removeLabel,
  tooLargeMessage,
  wrongTypeMessage,
  file,
  onChange,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const accept = (candidate: File) => {
    if (!ACCEPTED_UPLOAD_TYPES.includes(candidate.type)) {
      setError(wrongTypeMessage);
      return;
    }
    if (candidate.size > MAX_UPLOAD_BYTES) {
      setError(tooLargeMessage);
      return;
    }

    setError(null);
    onChange(candidate);
  };

  const clear = () => {
    setError(null);
    onChange(null);
    // Without this the same file cannot be picked again after removing it.
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-foreground"
        >
          {label}
        </label>
        <span className="text-[0.6875rem] uppercase tracking-wide text-muted-foreground">
          {optionalLabel}
        </span>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_UPLOAD_TYPES.join(",")}
        className="sr-only"
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          if (chosen) accept(chosen);
        }}
      />

      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
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
            onClick={clear}
            aria-label={removeLabel}
            title={removeLabel}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-danger"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) accept(dropped);
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border border-dashed px-4 py-3.5 text-left transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            dragging
              ? "border-accent bg-accent/10"
              : "border-border bg-background hover:border-accent/40 hover:bg-secondary/40",
          )}
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-accent/10">
            <Upload className="size-4 text-accent" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm text-foreground">{chooseLabel}</span>
            <span className="block text-xs text-muted-foreground">{hint}</span>
          </span>
          <Paperclip
            className="ml-auto size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      )}

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
