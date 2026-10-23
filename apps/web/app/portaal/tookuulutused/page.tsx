import { SubscriptionOffer } from '../../../components/portal/subscription-offer';
import { portalData } from '../../../lib/portal';
import { PortalShell } from '../../../components/portal/portal-shell';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await portalData();
  const query = await searchParams;
  const company = data.companies.find(item => item.id === query.company) ?? data.companies[0];
  if (company?.status === 'published' && company.currentSubscription === null) return <SubscriptionOffer key={company.id} company={company} plans={data.plans} available={data.checkoutAvailable} />;
  return <PortalShell company={company} active="/tookuulutused"><section className="panel"><h1>Töökuulutused</h1><p>Selle osa ühendame järgmises etapis.</p><a className="text-link" href={`/portaal${company ? `?company=${company.id}` : ''}`}>Tagasi ülevaatesse →</a></section></PortalShell>;
}
