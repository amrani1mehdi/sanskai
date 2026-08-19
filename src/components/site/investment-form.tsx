"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { SiteContent } from "@/lib/content";

const inputClass =
  "w-full px-4 py-3.5 rounded-lg bg-background text-foreground placeholder:text-muted-foreground border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all text-sm";

const EMPTY = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  nature: "",
  pays: "",
  descriptif: "",
};

export function InvestmentForm({ content }: { content: SiteContent }) {
  const { form } = content;

  const [values, setValues] = useState(EMPTY);
  const [sent, setSent] = useState(false);

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  // No backend in this rebuild yet — mirrors the live site's success UX.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValues(EMPTY);
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="bg-card rounded-2xl p-8 md:p-10 card-elevated border border-border sticky top-28">
      <h3 className="font-display text-xl font-bold text-card-foreground mb-1">
        {form.talkProject}
      </h3>
      <p className="text-sm text-muted-foreground mb-8">{form.fillForm}</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={form.lastName} value={values.nom} onChange={set("nom")} required />
          <Field
            label={form.firstName}
            value={values.prenom}
            onChange={set("prenom")}
            required
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label={form.email}
            type="email"
            value={values.email}
            onChange={set("email")}
            required
          />
          <Field
            label={form.phone}
            type="tel"
            value={values.telephone}
            onChange={set("telephone")}
            required
          />
        </div>

        <Field
          label={form.projectNature}
          value={values.nature}
          onChange={set("nature")}
        />
        <Field
          label={form.projectCountry}
          value={values.pays}
          onChange={set("pays")}
        />

        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">
            {form.projectDesc}
          </label>
          <textarea
            rows={4}
            className={`${inputClass} resize-none`}
            value={values.descriptif}
            onChange={(event) => set("descriptif")(event.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full gold-gradient text-accent-foreground font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm mt-2"
        >
          {sent ? (
            form.sent
          ) : (
            <>
              {form.submit} <Send size={16} />
            </>
          )}
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
