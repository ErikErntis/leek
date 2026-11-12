import { SubscriptionOffer } from '../../../components/portal/subscription-offer';
import { PortalShell } from '../../../components/portal/portal-shell';
import { ServiceEditor } from '../../../components/portal/service-editor';
import { portalData } from '../../../lib/portal';
import { getOwnServices } from '../../../lib/services';

export default async function Page({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
 const [data, query] = await Promise.all([portalData(), searchParams]);
 const company = data.companies.find(item => item.id === query.company) ?? data.companies[0];
 if (company?.status === 'published' && company.currentSubscription === null) {
  return <SubscriptionOffer key={company.id} company={company} plans={data.plans} available={data.checkoutAvailable} />;
 }
 return <PortalShell company={company} active="/teenused">
  {company ? <ServiceEditor key={company.id} company={company} initial={await getOwnServices(company.id)} />
   : <section className="panel"><h1>Lisa kõigepealt ettevõte</h1><a className="button" href="/ettevote/lisa">Lisa ettevõte</a></section>}
 </PortalShell>;
}
