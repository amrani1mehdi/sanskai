"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  Mail,
  Paperclip,
  Phone,
  StickyNote,
  Trash2,
  User,
  X,
} from "lucide-react";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { DocumentsPanel } from "@/components/crm/documents-panel";
import { NotesPanel } from "@/components/crm/notes-panel";
import { PrestationChip } from "@/components/crm/prestation-chip";
import { StatusBadge } from "@/components/crm/status-badge";
import { SERVICE_BY_ID, stagesFor } from "@/lib/crm/config";
import {
  formatAmount,
  formatCompanyAge,
  formatDate,
  formatDateTime,
  formatYesNo,
  initialsOf,
} from "@/lib/crm/format";
import {
  MIN_COMPANY_AGE_MONTHS,
  MIN_MONTHLY_REVENUE,
  isCompanyAgeEligible,
  isRevenueEligible,
} from "@/lib/eligibility";
import { useCrm, useLead } from "@/lib/crm/store";
import type { Lead, LeadStatus } from "@/lib/crm/types";

export function LeadDetail({ id }: { id: string }) {
  const { setStatus, removeLead, logContact } = useCrm();
  const { lead, status, reload } = useLead(id);
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Chargement du dossier…</p>
      </div>
    );
  }

  if (deleting) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Suppression du lead…</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-xl font-bold text-foreground">
          Lead introuvable
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette fiche n&apos;existe pas ou a été supprimée.
        </p>
        <Link
          href="/admin/leads"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <ArrowLeft size={15} /> Retour aux leads
        </Link>
      </div>
    );
  }

  const service = SERVICE_BY_ID[lead.service];

  return (
    <div className="container mx-auto px-4 py-8 lg:py-10">
      <Link
        href="/admin/leads"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-accent"
      >
        <ArrowLeft size={15} /> Retour aux leads
      </Link>

      {/* En-tête */}
      <header className="mt-4 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-secondary font-display text-lg font-bold text-foreground">
            {initialsOf(lead.prenom, lead.nom)}
          </span>
          <div>
            <p className="font-mono text-xs font-semibold text-accent">
              {lead.reference}
            </p>
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              {lead.prenom} {lead.nom}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {lead.entreprise} · {service.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Reçu le {formatDateTime(lead.createdAt)} · depuis{" "}
              <span className="font-mono">{service.source}</span>
            </p>
          </div>
        </div>

        <StatusBadge
          status={lead.status}
          service={lead.service}
          className="self-start px-3 py-1.5 text-sm"
        />
      </header>

      {/* Actions rapides */}
      <ActionBar lead={lead} onLog={logContact} />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <LeadInformation lead={lead} />
          <DocumentsPanel lead={lead} onChanged={reload} />
          <NotesPanel lead={lead} onChanged={reload} />
          <ActivityTimeline lead={lead} />
        </div>

        {/* Panneau latéral */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {lead.service === "financement" ? <Eligibility lead={lead} /> : null}

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 font-display text-base font-bold text-foreground">
              Suivi du dossier
            </h2>

            <label
              htmlFor="statut"
              className="mb-1.5 block text-xs font-medium text-foreground"
            >
              Statut
            </label>
            <select
              id="statut"
              value={lead.status}
              onChange={async (event) => {
                setStatus(lead.id, event.target.value as LeadStatus);
                // The list store and this page hold separate copies.
                setTimeout(() => void reload(), 250);
              }}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              {/* Only what this lead's service allows: a message is answered
                  or not, a dossier moves through the six stages. The API
                  refuses the rest, so offering them would be a trap. */}
              {stagesFor(lead.service).map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>

          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 font-display text-base font-bold text-foreground">
              Récapitulatif
            </h2>
            <dl className="space-y-3 text-sm">
              <SummaryRow label="Service" value={service.label} />
              {lead.service === "financement" ? (
                <>
                  <SummaryRow label="Montant demandé" value={formatAmount(lead.montant)} />
                  <SummaryRow
                    label="Chiffre d'affaires mensuel"
                    value={lead.chiffreAffaire || "Non renseigné"}
                  />
                  <SummaryRow
                    label="Ancienneté"
                    value={formatCompanyAge(lead.dateCreation)}
                  />
                </>
              ) : null}
              <SummaryRow label="Documents" value={`${lead.documents.length}`} />
              <SummaryRow label="Notes" value={`${lead.notes.length}`} />
              <SummaryRow
                label="Dernière mise à jour"
                value={formatDate(lead.updatedAt)}
              />
            </dl>
          </section>

          <section className="rounded-xl border border-danger/25 bg-card p-6">
            <h2 className="font-display text-base font-bold text-foreground">
              Supprimer le lead
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Le dossier, ses {lead.documents.length} document
              {lead.documents.length > 1 ? "s" : ""}, ses notes et son historique
              seront perdus.
            </p>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-danger/40 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
            >
              <Trash2 size={15} /> Supprimer définitivement
            </button>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Supprimer ce lead ?"
        description={`Le dossier ${lead.reference} de ${lead.prenom} ${lead.nom} (${lead.entreprise}) sera définitivement supprimé, avec ses documents, ses notes et son historique. Cette action est irréversible.`}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          setDeleting(true);
          removeLead(lead.id);
          router.push("/admin/leads");
        }}
      />
    </div>
  );
}

function ActionBar({
  lead,
  onLog,
}: {
  lead: Lead;
  onLog: ReturnType<typeof useCrm>["logContact"];
}) {
  const action =
    "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-secondary";

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {lead.telephone ? (
        <a
          href={`tel:${lead.telephone.replace(/\s/g, "")}`}
          onClick={() => onLog(lead.id, "appel")}
          className={action}
        >
          <Phone size={15} className="text-accent" /> Appeler
        </a>
      ) : null}

      <a
        href={`mailto:${lead.email}?subject=${encodeURIComponent(
          `Votre demande ${lead.reference} — Sansekai Solution`,
        )}`}
        onClick={() => onLog(lead.id, "email")}
        className={action}
      >
        <Mail size={15} className="text-accent" /> Envoyer un email
      </a>

      <a href="#notes" className={action}>
        <StickyNote size={15} className="text-accent" /> Ajouter une note
      </a>

      <a href="#documents" className={action}>
        <Paperclip size={15} className="text-accent" /> Consulter les documents
        {lead.documents.length > 0 ? (
          <span className="bg-secondary px-1.5 text-xs font-semibold">
            {lead.documents.length}
          </span>
        ) : null}
      </a>
    </div>
  );
}

/**
 * Every field the originating form collects, blanks included — an empty
 * optional field is information too, so it shows as "Non renseigné" rather
 * than disappearing.
 */
function LeadInformation({ lead }: { lead: Lead }) {
  const isFinancement = lead.service === "financement";
  const isContact = lead.service === "contact";

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-5 font-display text-base font-bold text-foreground">
        Informations transmises
      </h2>

      <FieldGroup icon={User} title="Contact">
        <Field label="Nom" value={lead.nom} />
        <Field label="Prénom" value={lead.prenom} />
        <Field label="Email" value={lead.email} href={`mailto:${lead.email}`} />
        <Field
          label="Téléphone"
          value={lead.telephone}
          href={lead.telephone ? `tel:${lead.telephone.replace(/\s/g, "")}` : undefined}
        />
      </FieldGroup>

      <FieldGroup icon={Building2} title="Entreprise">
        <Field label="Nom de l'entreprise" value={lead.entreprise} />
        {/* Only the contact form asks for it. Shown on a contact lead even when
            blank — it was offered and skipped — and hidden entirely on the
            other two, where an empty row would just be noise. */}
        {isContact ? <Field label="SIREN" value={lead.siren} /> : null}
        {isFinancement ? (
          <>
            <Field
              label="Date de création"
              value={lead.dateCreation ? formatDate(lead.dateCreation) : undefined}
            />
            <Field label="Ancienneté" value={formatCompanyAge(lead.dateCreation)} />
            <Field label="Adresse" value={lead.adresse} />
            <Field label="Code postal" value={lead.codePostal} />
            <Field label="Ville" value={lead.ville} />
          </>
        ) : null}
      </FieldGroup>

      <FieldGroup icon={Paperclip} title="Demande">
        {isFinancement ? (
          <>
            <Field label="Montant réclamé" value={formatAmount(lead.montant)} />
            <Field label="Chiffre d'affaires mensuel" value={lead.chiffreAffaire} />
            <Field label="Code commercial" value={lead.codeCommercial} />
            <Field label="Site web" value={formatYesNo(lead.siteWeb)} />
            <Field label="Adresse du site" value={lead.siteWebUrl} />
            <Field label="Réseaux sociaux" value={formatYesNo(lead.reseaux)} />
            <Field label="Lesquels" value={lead.reseauxOu} />
          </>
        ) : (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Sous-service demandé</dt>
            <dd className="mt-1.5">
              {lead.prestation ? (
                <PrestationChip prestation={lead.prestation} />
              ) : (
                <span className="text-sm text-muted-foreground">Non renseigné</span>
              )}
            </dd>
          </div>
        )}
        <Field label="Message" value={lead.message} wide />
      </FieldGroup>
    </section>
  );
}

function FieldGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={14} className="text-accent" />
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
      </div>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function Field({
  label,
  value,
  href,
  wide,
}: {
  label: string;
  value?: string;
  href?: string;
  wide?: boolean;
}) {
  const empty = !value || value.trim() === "";

  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm break-words whitespace-pre-line text-foreground">
        {empty ? (
          <span className="text-muted-foreground">Non renseigné</span>
        ) : href ? (
          <a href={href} className="text-accent hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

/**
 * Restates the gate the public form already applied, using the very same rules
 * module — so the CRM can never disagree with what the applicant was told.
 */
function Eligibility({ lead }: { lead: Lead }) {
  const ageOk = isCompanyAgeEligible(lead.dateCreation);
  const revenueOk = isRevenueEligible(lead.chiffreAffaire);

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-1 font-display text-base font-bold text-foreground">
        Éligibilité
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Règles appliquées par le formulaire au dépôt.
      </p>

      <ul className="space-y-3">
        <Criterion
          ok={ageOk}
          label={`Au moins ${MIN_COMPANY_AGE_MONTHS} mois d'activité`}
          detail={formatCompanyAge(lead.dateCreation)}
        />
        <Criterion
          ok={revenueOk}
          label={`Chiffre d'affaires mensuel ≥ ${new Intl.NumberFormat("fr-FR").format(
            MIN_MONTHLY_REVENUE,
          )} €`}
          detail={lead.chiffreAffaire || "Non renseigné"}
        />
      </ul>
    </section>
  );
}

function Criterion({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={
          ok
            ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-success/15 text-success"
            : "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-danger/15 text-danger"
        }
      >
        {ok ? <Check size={12} /> : <X size={12} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </li>
  );
}
