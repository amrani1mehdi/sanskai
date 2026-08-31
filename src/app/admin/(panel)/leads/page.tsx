import { CrmWorkspace } from "@/components/crm/crm-workspace";

/**
 * Leads — the operational workspace.
 *
 * Sits at /admin/leads so the section and its URL agree, and so a lead's own
 * page at /admin/leads/[id] reads as a child of it rather than a sibling.
 */
export default function LeadsPage() {
  return <CrmWorkspace />;
}
