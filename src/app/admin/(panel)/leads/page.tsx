import { CrmWorkspace } from "@/components/crm/crm-workspace";

/**
 * Leads — the operational workspace.
 *
 * Sits at /admin/leads so the section and its URL agree, and so a lead's own
 * page at /admin/leads/[id] reads as a child of it rather than a sibling.
 *
 * `?lead=<id>` opens that lead's panel over the board, as clicking its card
 * would. It is the address a lead notification email links to.
 */
export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  const { lead } = await searchParams;

  return <CrmWorkspace openLeadId={typeof lead === "string" ? lead : null} />;
}
