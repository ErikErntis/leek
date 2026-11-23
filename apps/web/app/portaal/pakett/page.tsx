import { SubscriptionOffer } from '../../../components/portal/subscription-offer';
import { portalData } from '../../../lib/portal';
import { PortalShell } from '../../../components/portal/portal-shell';
import { PackageChoice } from '../../../components/portal/package-choice';
import { PaymentStatus } from '../../../components/portal/payment-status';

export default async function PackagePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await portalData();
  const query = await searchParams;
  const company = data.companies.find(c => c.id === query.company) ?? data.companies[0];
  if (company?.status === 'published' && company.currentSubscription === null && query.payment !== 'success') {
    return <SubscriptionOffer key={company.id} company={company} plans={data.plans} available={data.checkoutAvailable} />;
  }
  return <PortalShell company={company} active="/pakett">
    <div className="workspace-heading"><div><h1>Pakett ja maksmine</h1><p>{company?.name}</p></div></div>
    {query.payment === 'cancelled' && company?.plan === 'free' && <p role="status">Makse jäi pooleli. Saad proovida uuesti või jätkata tasuta paketiga.</p>}
    {!company || company.status !== 'published' ? <section className="panel">
      <h2>Paketi saab aktiveerida pärast ettevõtte kinnitamist.</h2>
      <a className="text-link" href="/portaal">Tagasi ülevaatesse →</a>
    </section> : company.plan !== 'free' ? <section className="panel" role="status">
      <h2>{data.plans.find(p => p.id === company.plan)?.name} on aktiivne</h2>
      {query.payment === 'success' && <p>Aitäh! Sinu pakett on aktiveeritud.</p>}
      <p>Kehtib kuni {company.paidUntil ? new Intl.DateTimeFormat('et-EE').format(new Date(company.paidUntil)) : ''}.</p>
      <p>Automaatset pikenemist ei ole. Aktiivse aastapaketi muutmiseks võta ühendust LEEKi halduriga.</p>
      <a href={`/portaal?company=${company.id}`} className="button">Tagasi töölauale</a>
    </section> : query.payment === 'success' ? <PaymentStatus key={company.id} checkFailed={company.paymentCheckFailed} /> : <PackageChoice key={company.id} company={company} plans={data.plans} available={data.checkoutAvailable} />}
  </PortalShell>;
}
