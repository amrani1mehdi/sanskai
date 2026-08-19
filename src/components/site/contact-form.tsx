"use client";

import { useState } from "react";
import { CircleCheck, Send, Upload } from "lucide-react";
import type { SiteContent } from "@/lib/content";

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
  const { contact } = content;

  const [values, setValues] = useState(EMPTY);
  const [sent, setSent] = useState(false);

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  // The live site writes to Supabase. Without a backend here the form shows the
  // same confirmation panel and then returns to the empty state.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValues(EMPTY);
    setSent(true);
    setTimeout(() => setSent(false), 4000);
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

      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label={contact.fields.company}
          value={values.company}
          onChange={set("company")}
          required
        />
        <Field
          label={contact.fields.siren}
          value={values.siren}
          onChange={set("siren")}
        />
        <Field
          label={contact.fields.fullName}
          value={values.fullName}
          onChange={set("fullName")}
          required
        />
        <Field
          label={contact.fields.email}
          type="email"
          value={values.email}
          onChange={set("email")}
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

        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">
            {contact.fields.upload}
          </label>
          {/* Presentational on the live site too — there is no file input
              behind it, and nothing is uploaded. */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center transition-colors hover:border-accent/30">
            <Upload size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{contact.uploadHint}</p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full gold-gradient text-accent-foreground font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm mt-2"
        >
          {contact.submit} <Send size={16} />
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground mb-1.5 block">{label}</label>
      <input
        required={required}
        type={type}
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
