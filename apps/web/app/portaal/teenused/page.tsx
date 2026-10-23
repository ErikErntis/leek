import { portalData } from '../../../lib/portal';
import { PortalShell } from '../../../components/portal/portal-shell';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await portalData();
  const query = await searchParams;
  const company = data.companies.find(item => item.id === query.company) ?? data.companies[0];
  return <PortalShell company={company} active="/teenused"><section className="panel"><h1>Teenuste haldus</h1><p>Selle osa ühendame järgmises etapis.</p><a className="text-link" href={`/portaal${company ? `?company=${company.id}` : ''}`}>Tagasi ülevaatesse →</a></section></PortalShell>;
}
