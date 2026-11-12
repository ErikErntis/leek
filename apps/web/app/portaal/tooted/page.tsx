import { ProductPortal } from '../../../components/portal/product-portal';
import { PortalShell } from '../../../components/portal/portal-shell';
import { SubscriptionOffer } from '../../../components/portal/subscription-offer';
import { portalData } from '../../../lib/portal';
import { getOwnProducts } from '../../../lib/products';

export default async function ProductsPortalPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
 const [data, query] = await Promise.all([portalData(), searchParams]);
 const company = data.companies.find(item => item.id === query.company) ?? data.companies[0];
 if (company?.status === 'published' && company.currentSubscription === null) {
  return <SubscriptionOffer key={company.id} company={company} plans={data.plans} available={data.checkoutAvailable} />;
 }
 return <PortalShell company={company} active="/tooted">
  {company ? <ProductPortal key={company.id} company={company} initial={await getOwnProducts(company.id)} />
   : <section className="panel"><h1>Lisa kõigepealt ettevõte</h1><a className="button" href="/ettevote/lisa">Lisa ettevõte</a></section>}
 </PortalShell>;
}
