import { PRESTATION_BY_ID } from "@/lib/crm/config";
import type { PrestationId } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

/**
 * The sub-service a Développement lead picked. The enquiry form is a single
 * select, so there is exactly one per lead.
 */
export function PrestationChip({
  prestation,
  short,
  className,
}: {
  prestation: PrestationId;
  /** Short label for tight spots — table cells, Kanban cards. */
  short?: boolean;
  className?: string;
}) {
  const config = PRESTATION_BY_ID[prestation];
  if (!config) return null;

  return (
    <span
      title={config.label}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        config.chip,
        className,
      )}
    >
      {short ? config.shortLabel : config.label}
    </span>
  );
}
