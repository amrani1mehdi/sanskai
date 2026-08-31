import { STAGE_BY_ID } from "@/lib/crm/config";
import type { LeadStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  const stage = STAGE_BY_ID[status];

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
