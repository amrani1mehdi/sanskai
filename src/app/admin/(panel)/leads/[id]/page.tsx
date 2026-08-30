import { LeadDetail } from "@/components/crm/lead-detail";

export default async function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  const { id } = await params;

  return <LeadDetail id={id} />;
}
