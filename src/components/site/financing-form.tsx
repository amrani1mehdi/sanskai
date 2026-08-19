"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { SiteContent } from "@/lib/content";

/** Shared by every field on the live site's financing form. */
const inputClass =
  "w-full px-4 py-3.5 rounded-lg bg-background text-foreground placeholder:text-muted-foreground border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all text-sm";

const EMPTY = {
  nom: "",
  prenom: "",
  telephone: "",
  email: "",
  entreprise: "",
  adresse: "",
  codePostal: "",
  ville: "",
  chiffreAffaire: "",
  montant: "",
  codeCommercial: "",
  message: "",
};

export function FinancingForm({ content }: { content: SiteContent }) {
  const { form } = content;

  const [values, setValues] = useState(EMPTY);
  const [sent, setSent] = useState(false);

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  // The live site posts to a Supabase edge function. There is no backend in
  // this rebuild yet, so the form mirrors the same success UX locally.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValues(EMPTY);
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="bg-card rounded-2xl p-8 md:p-10 card-elevated border border-border sticky top-28">
      <h3 className="font-display text-xl font-bold text-card-foreground mb-1">
        {form.treasuryRequest}
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
            label={form.phone}
            type="tel"
            value={values.telephone}
            onChange={set("telephone")}
            required
          />
          <Field
            label={form.email}
            type="email"
            value={values.email}
            onChange={set("email")}
            required
          />
        </div>

        <Field
          label={form.company}
          value={values.entreprise}
          onChange={set("entreprise")}
          required
        />
        <Field label={form.address} value={values.adresse} onChange={set("adresse")} />

        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label={form.postalCode}
            value={values.codePostal}
            onChange={set("codePostal")}
            required
          />
          <Field label={form.city} value={values.ville} onChange={set("ville")} required />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label={form.revenue}
            value={values.chiffreAffaire}
            onChange={set("chiffreAffaire")}
            required
          />
          <Field
            label={form.amount}
            value={values.montant}
            onChange={set("montant")}
            required
          />
        </div>

        <Field
          label={form.commercialCode}
          value={values.codeCommercial}
          onChange={set("codeCommercial")}
        />

        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">
            {form.message}
          </label>
          <textarea
            rows={4}
            className={`${inputClass} resize-none`}
            value={values.message}
            onChange={(event) => set("message")(event.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full gold-gradient text-accent-foreground font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm mt-2 disabled:opacity-50"
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
