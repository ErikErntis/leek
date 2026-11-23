import { PortalShell } from '../../../components/portal/portal-shell';
import { WorkPortal } from '../../../components/portal/work-portal';
import { portalData } from '../../../lib/portal';
import { getOwnWork } from '../../../lib/work';

export const metadata = { title: 'Tööpakkumised ja tööampsud' };

export default async function WorkPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
 const [data, query] = await Promise.all([portalData(), searchParams]);
 const company = data.companies.find(item => item.id === query.company) ?? data.companies[0];
 return <PortalShell company={company} active="/tookuulutused">
  {company ? <WorkPortal key={company.id} company={company} initial={await getOwnWork(company.id)} /> :
   <section className="panel"><h1>Lisa kõigepealt ettevõte</h1><a className="button" href="/ettevote/lisa">Lisa ettevõte</a></section>}
 </PortalShell>;
}
