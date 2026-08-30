"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  CircleCheck,
  Megaphone,
  Monitor,
  Palette,
  Send,
  Stamp,
} from "lucide-react";
import type { SiteContent } from "@/lib/content";
import { MotionReveal } from "@/components/ui/motion-reveal";

const SERVICE_ICONS = {
  website: Monitor,
  logo: Palette,
  ads: Megaphone,
  loyalty: Stamp,
} as const;

const inputClass =
  "w-full px-4 py-3.5 rounded-lg bg-background text-foreground placeholder:text-muted-foreground border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all text-sm";

const EMPTY = {
  service: "",
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  entreprise: "",
  message: "",
};

/**
 * The services and the enquiry form beneath them.
 *
 * They live in one component because each card's button both scrolls to the
 * form and picks that service in it — the state has to be shared, and a server
 * boundary between the two would break that.
 */
export function BusinessServices({ content }: { content: SiteContent }) {
  const { businessDevelopment, form } = content;

  const [values, setValues] = useState(EMPTY);
  const [sent, setSent] = useState(false);
  const serviceRef = useRef<HTMLSelectElement>(null);

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  /** Card button: choose the service, then bring the form into view. */
  const requestService = (title: string) => {
    setValues((current) => ({ ...current, service: title }));
    serviceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus after the scroll, so the browser does not jump instead of gliding.
    window.setTimeout(() => serviceRef.current?.focus({ preventScroll: true }), 500);
  };

  // No backend yet, so this mirrors the other forms' local success state.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValues(EMPTY);
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <>
      <section className="section-padding bg-background">
        <div className="container mx-auto px-4">
          {/* Two-up: four cards across three columns would orphan the last. */}
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {businessDevelopment.services.map((service, index) => {
              const Icon = SERVICE_ICONS[service.icon];
              return (
                <MotionReveal
                  key={service.title}
                  y={24}
                  delay={index * 100}
                  className="flex flex-col bg-card rounded-xl p-8 card-elevated border border-border group hover:border-accent/20 transition-colors"
                >
                  <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent transition-all duration-300">
                    <Icon
                      size={24}
                      className="text-accent group-hover:text-accent-foreground transition-colors"
                    />
                  </div>
                  <h3 className="font-display text-lg font-bold text-card-foreground mb-3">
                    {service.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>

                  <ul className="mt-5 space-y-2.5">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex gap-2.5">
                        <CircleCheck
                          size={16}
                          className="mt-0.5 shrink-0 text-accent"
                          aria-hidden
                        />
                        <span className="text-sm text-muted-foreground leading-relaxed">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => requestService(service.title)}
                    className="mt-auto pt-6 inline-flex items-center gap-2 self-start text-sm font-semibold text-accent transition-colors hover:text-foreground"
                  >
                    {businessDevelopment.requestService}
                    <ArrowRight size={14} aria-hidden />
                  </button>
                </MotionReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section id="devis" className="section-padding bg-secondary">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <MotionReveal y={20}>
              <div className="bg-card rounded-2xl p-8 md:p-10 card-elevated border border-border">
                <h2 className="font-display text-2xl font-bold text-card-foreground mb-1 text-center">
                  {businessDevelopment.form.title}
                </h2>
                <p className="text-sm text-muted-foreground mb-8 text-center">
                  {businessDevelopment.form.description}
                </p>

                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="business-service"
                      className="text-xs font-medium text-foreground mb-1.5 block"
                    >
                      {form.service}
                    </label>
                    <select
                      id="business-service"
                      ref={serviceRef}
                      required
                      className={`${inputClass} appearance-none`}
                      value={values.service}
                      onChange={(event) => set("service")(event.target.value)}
                    >
                      <option value="">{form.selectService}</option>
                      {businessDevelopment.services.map((service) => (
                        <option key={service.title} value={service.title}>
                          {service.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field
                      label={form.lastName}
                      value={values.nom}
                      onChange={set("nom")}
                      required
                    />
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
                    label={form.company}
                    value={values.entreprise}
                    onChange={set("entreprise")}
                    required
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
            </MotionReveal>
          </div>
        </div>
      </section>
    </>
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
