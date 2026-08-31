"use client";

import { useId, useState } from "react";
import { CircleCheck, Send, TriangleAlert } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import type { SiteContent } from "@/lib/content";
import { translateApiError } from "@/lib/leads/errors";
import { checkEmail, checkRequired, collect } from "@/lib/leads/validate";
import { cn } from "@/lib/utils";

/** Matches `StoreContactLeadRequest::MAX_INVOICES` — the API rejects more. */
const MAX_INVOICES = 20;

const inputClass =
  "w-full px-4 py-3.5 rounded-lg bg-background text-foreground placeholder:text-muted-foreground border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all text-sm";

const EMPTY = {
  company: "",
  siren: "",
  fullName: "",
  email: "",
  message: "",
};

export function ContactForm({ content }: { content: SiteContent }) {
  // `form` carries the upload labels the financing page already uses.
  const { contact, form } = content;

  const [values, setValues] = useState(EMPTY);
  const [invoices, setInvoices] = useState<File[]>([]);
  const [invoiceError, setInvoiceError] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setError(null);
    setFieldErrors((current) => {
      if (current[key] === undefined) return current;

      const next = { ...current };
      delete next[key];

      return next;
    });
  };

  /**
   * Posts to a route handler on this origin, which forwards to the CRM. The
   * message lands in the back office as a `contact` lead with its own
   * CON-YYYY-NNNN reference.
   */
  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    /*
      * Checked here rather than left to the browser's own `required`, whose
      * message comes out in the language the browser was installed in — not the
      * one the visitor is reading the page in.
      */
    const invalid = collect({
      entreprise: checkRequired(values.company, form),
      siren: checkRequired(values.siren, form),
      nomComplet: checkRequired(values.fullName, form),
      email: checkEmail(values.email, form),
      // message and the invoices are deliberately absent — both optional.
    });

    if (Object.keys(invalid).length > 0) {
      setFieldErrors(invalid);
      setError(form.checkFields);
      return;
    }

    setError(null);
    setInvoiceError(undefined);
    setFieldErrors({});
    setPending(true);

    /* multipart, because the invoices ride along. No Content-Type header:
       fetch adds the multipart boundary, and setting it by hand makes every
       file unreadable at the other end. */
    const body = new FormData();
    body.set("entreprise", values.company);
    body.set("nomComplet", values.fullName);
    body.set("email", values.email);
    if (values.siren) body.set("siren", values.siren);
    if (values.message) body.set("message", values.message);
    for (const invoice of invoices) body.append("factures[]", invoice);

    try {
      const response = await fetch("/api/leads/contact", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const errors = (payload?.errors ?? {}) as Record<string, string[]>;

        // Keyed per file — `factures.0` — so the slot's own name never matches
        // and the message would otherwise only reach the banner.
        const invoice = Object.entries(errors).find(([key]) =>
          key.startsWith("factures"),
        )?.[1]?.[0];

        setInvoiceError(invoice ? translateApiError(invoice, form) : undefined);
        // Laravel reports per field; the first message is the actionable one,
        // translated because the API answers in English whatever the visitor
        // reads. This form shows one line, so the rest are not needed.
        const first = payload?.errors
          ? Object.values(payload.errors as Record<string, string[]>)[0]?.[0]
          : undefined;

        setError(
          first
            ? translateApiError(first, form)
            : (payload?.message ?? contact.error),
        );
        setPending(false);
        return;
      }

      // Cleared only once the CRM has it — a failed send must not lose what
      // they typed, or the files they picked.
      setValues(EMPTY);
      setInvoices([]);
      setSent(true);
    } catch {
      setError(contact.error);
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-card rounded-2xl p-10 card-elevated border border-border text-center">
        <CircleCheck size={48} className="text-accent mx-auto mb-4" />
        <h3 className="font-display text-xl font-bold text-card-foreground mb-2">
          {contact.success}
        </h3>
        <p className="text-sm text-muted-foreground">{contact.successDesc}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-8 md:p-10 card-elevated border border-border">
      <h3 className="font-display text-xl font-bold text-card-foreground mb-1">
        {contact.formTitle}
      </h3>
      <p className="text-sm text-muted-foreground mb-8">{contact.formDesc}</p>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field
          label={contact.fields.company}
          value={values.company}
          onChange={set("company")}
          error={fieldErrors.entreprise}
          required
        />
        <Field
          label={contact.fields.siren}
          value={values.siren}
          onChange={set("siren")}
          error={fieldErrors.siren}
          required
        />
        <Field
          label={contact.fields.fullName}
          value={values.fullName}
          onChange={set("fullName")}
          error={fieldErrors.nomComplet}
          required
        />
        <Field
          label={contact.fields.email}
          type="email"
          value={values.email}
          onChange={set("email")}
          error={fieldErrors.email}
          required
        />

        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">
            {contact.fields.message}
          </label>
          <textarea
            rows={4}
            className={`${inputClass} resize-none`}
            value={values.message}
            onChange={(event) => set("message")(event.target.value)}
          />
        </div>

        {/* Was a decorative box with no input behind it. It now uploads, and
            reuses the financing form's component so both pages enforce the
            same type and size rules. */}
        <FileUpload
          label={contact.fields.upload}
          optionalLabel={form.optional}
          hint={contact.uploadHint}
          removeLabel={form.removeFile}
          tooLargeMessage={form.fileTooLarge}
          wrongTypeMessage={form.fileWrongType}
          files={invoices}
          onChange={setInvoices}
          multiple
          addMoreLabel={form.addAnotherFile}
          maxFiles={MAX_INVOICES}
          serverError={invoiceError}
        />

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className={`w-full gold-gradient text-accent-foreground font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-opacity text-sm mt-2 ${
            pending ? "cursor-not-allowed opacity-60" : "hover:opacity-90"
          }`}
        >
          {pending ? contact.sending : contact.submit} <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  /** What is wrong with this field, in the visitor's language. */
  error?: string;
}) {
  const errorId = useId();

  return (
    <div>
      <label className="text-xs font-medium text-foreground mb-1.5 block">{label}</label>
      <input
        required={required}
        type={type}
        aria-invalid={error !== undefined || undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(inputClass, error && "border-danger focus:border-danger")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
