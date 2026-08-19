"use client";

import { useState } from "react";
import { Lock, Send, Shield } from "lucide-react";
import { siteContent } from "@/lib/content";

const { form, common, cryptoPage } = siteContent;

/** Same field styling as the financing form; selects drop the native arrow. */
const inputClass =
  "w-full px-4 py-3.5 rounded-lg bg-background text-foreground placeholder:text-muted-foreground border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all text-sm";
const selectClass = `${inputClass} appearance-none`;

const EMPTY = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  service: "",
  experience: "",
  objectif: "",
  message: "",
};

export function CryptoForm() {
  const [values, setValues] = useState(EMPTY);
  const [sent, setSent] = useState(false);

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  // The live site posts to Supabase. Without a backend here the form mirrors
  // the same success UX locally.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValues(EMPTY);
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="bg-card rounded-2xl p-8 md:p-10 card-elevated border border-border">
      <h3 className="font-display text-2xl font-bold text-card-foreground mb-1 text-center">
        {cryptoPage.formTitle}
      </h3>
      <p className="text-sm text-muted-foreground mb-8 text-center">
        {cryptoPage.formDesc}
      </p>

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

        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">
            {form.service}
          </label>
          <select
            className={selectClass}
            value={values.service}
            onChange={(event) => set("service")(event.target.value)}
          >
            <option value="">{form.selectService}</option>
            <option>{form.walletCreation}</option>
            <option>{form.walletManagement}</option>
            <option>{form.buySell}</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">
            {form.experience}
          </label>
          <select
            required
            className={selectClass}
            value={values.experience}
            onChange={(event) => set("experience")(event.target.value)}
          >
            <option value="">{form.selectLevel}</option>
            <option>{form.beginner}</option>
            <option>{form.intermediate}</option>
            <option>{form.advanced}</option>
          </select>
        </div>

        <Field
          label={form.objective}
          value={values.objectif}
          onChange={set("objectif")}
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

      <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Shield size={14} className="text-accent" /> {common.confidential}
        </span>
        <span className="flex items-center gap-1.5">
          <Lock size={14} className="text-accent" /> {common.secure}
        </span>
      </div>
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
