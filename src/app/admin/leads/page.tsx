import { LeadsView, type InitialFilters } from "@/components/crm/leads-view";

/** `?service=`, `?prestation=`, `?statut=` — set by the sidebar and dashboard. */
export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const initial: InitialFilters = {
    service: first(params.service),
    statut: first(params.statut),
    prestation: first(params.prestation),
    q: first(params.q),
  };

  // The filters seed component state, so a new query string needs a fresh mount.
  return <LeadsView key={JSON.stringify(initial)} initial={initial} />;
}
