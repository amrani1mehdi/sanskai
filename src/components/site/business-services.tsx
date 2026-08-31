"use client";

import { useId, useRef, useState } from "react";
import {
  ArrowRight,
  CircleCheck,
  Loader2,
  Megaphone,
  Monitor,
  Palette,
  Send,
  TriangleAlert,
} from "lucide-react";
import type { SiteContent } from "@/lib/content";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { cn } from "@/lib/utils";

const SERVICE_ICONS = {
  website: Monitor,
  logo: Palette,
  ads: Megaphone,
} as const;

/**
 * The CRM's `prestation` value for each service.
 *
 * Keyed on the icon rather than the title, because the title is translated and
 * the API expects one of three fixed values whatever language the visitor reads.
 */
const SERVICE_VALUES = {
  website: "site_web",
  logo: "logo",
  ads: "campagne_publicitaire",
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
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Per-field messages from the API's 422, keyed by its own field names. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const serviceRef = useRef<HTMLSelectElement>(null);

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  /** Card button: choose the service, then bring the form into view. */
  const requestService = (value: string) => {
    setValues((current) => ({ ...current, service: value }));
    serviceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus after the scroll, so the browser does not jump instead of gliding.
    window.setTimeout(() => serviceRef.current?.focus({ preventScroll: true }), 500);
  };

  /**
   * Posts the enquiry to the CRM.
   *
   * Through a route handler on this origin rather than straight to the API, so
   * the shared key that authorises the call stays on the server.
   */
  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setError(null);
    setFieldErrors({});

    let response: Response;

    try {
      response = await fetch("/api/leads/developpement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: values.service,
          nom: values.nom,
          prenom: values.prenom,
          email: values.email,
          telephone: values.telephone,
          entreprise: values.entreprise,
          // Omitted when blank, so an empty note does not land in the CRM.
          ...(values.message.trim() !== "" ? { message: values.message } : {}),
        }),
      });
    } catch {
      setError(form.errorUnavailable);
      setSending(false);
      return;
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);

      if (response.status === 422 && payload?.errors) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(payload.errors as Record<string, string[]>).map(
              ([field, messages]) => [field, messages[0]],
            ),
          ),
        );
      }

      setError(
        response.status === 429
          ? form.errorRateLimit
          : response.status === 503
            ? form.errorUnavailable
            : (payload?.message ?? form.errorGeneric),
      );
      setSending(false);
      return;
    }

    setValues(EMPTY);
    setSending(false);
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
                    onClick={() => requestService(SERVICE_VALUES[service.icon])}
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
                      aria-invalid={fieldErrors.service !== undefined || undefined}
                      aria-describedby={
                        fieldErrors.service ? "business-service-error" : undefined
                      }
                      value={values.service}
                      onChange={(event) => set("service")(event.target.value)}
                    >
                      <option value="">{form.selectService}</option>
                      {businessDevelopment.services.map((service) => (
                        <option key={service.icon} value={SERVICE_VALUES[service.icon]}>
                          {service.title}
                        </option>
                      ))}
                    </select>

                    {fieldErrors.service ? (
                      <p id="business-service-error" className="mt-1.5 text-xs text-danger">
                        {fieldErrors.service}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field
                      label={form.lastName}
                      value={values.nom}
                      onChange={set("nom")}
                      error={fieldErrors.nom}
                      required
                    />
                    <Field
                      label={form.firstName}
                      value={values.prenom}
                      onChange={set("prenom")}
                      error={fieldErrors.prenom}
                      required
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field
                      label={form.email}
                      type="email"
                      value={values.email}
                      onChange={set("email")}
                      error={fieldErrors.email}
                      required
                    />
                    <Field
                      label={form.phone}
                      type="tel"
                      value={values.telephone}
                      onChange={set("telephone")}
                      error={fieldErrors.telephone}
                      required
                    />
                  </div>

                  <Field
                    label={form.company}
                    value={values.entreprise}
                    onChange={set("entreprise")}
                    error={fieldErrors.entreprise}
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
                    disabled={sending}
                    className="w-full gold-gradient text-accent-foreground font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm mt-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sent ? (
                      form.sent
                    ) : sending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> {form.sending}
                      </>
                    ) : (
                      <>
                        {form.submit} <Send size={16} />
                      </>
                    )}
                  </button>

                  {error ? (
                    <p
                      role="alert"
                      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive"
                    >
                      <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </p>
                  ) : null}
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
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  /** A message the API returned against this field. */
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
