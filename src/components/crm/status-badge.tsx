import { STAGE_BY_ID, stagesFor } from "@/lib/crm/config";
import type { LeadStatus, ServiceId } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  service,
  className,
}: {
  status: LeadStatus;
  /**
   * The lead's service, when the caller knows it.
   *
   * `nouveau` is shared and reads differently either side — "Nouveau" on a
   * dossier, "Non répondu" on a contact message. Without this the badge falls
   * back to the pipeline wording, which is right for most of the CRM and wrong
   * on the messages page.
   */
  service?: ServiceId;
  className?: string;
}) {
  const stage =
    (service ? stagesFor(service).find((one) => one.id === status) : undefined) ??
    STAGE_BY_ID[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        stage.badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", stage.dot)} />
      {stage.label}
    </span>
  );
}
