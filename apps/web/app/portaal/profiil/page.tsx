import { CompanyProfileForm } from '../../../components/portal/company-profile-form';
import { getOwnProfile } from '../../../lib/company-api';
import { SubscriptionOffer } from '../../../components/portal/subscription-offer';
import { portalData } from '../../../lib/portal';
import { PortalShell } from '../../../components/portal/portal-shell';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await portalData();
  const query = await searchParams;
  const company = data.companies.find(item => item.id === query.company) ?? data.companies[0];
  if (company?.status === 'published' && company.currentSubscription === null) return <SubscriptionOffer key={company.id} company={company} plans={data.plans} available={data.checkoutAvailable} />;
  if (!company) return <PortalShell active="/profiil"><section className="panel"><h1>Lisa kõigepealt ettevõte</h1><a className="button" href="/ettevote/lisa">Lisa ettevõte</a></section></PortalShell>;
  const profile = await getOwnProfile(company.id);
  return <PortalShell company={company} active="/profiil"><div className="workspace-heading"><div><span className="eyebrow">SINU ETTEVÕTTE NÄGU</span><h1>Ettevõtte profiil</h1><p>Tutvusta oma ettevõtet ja hoia kontaktandmed ajakohased.</p></div><span className="badge">{company.status==='published'?'Kinnitatud':company.status==='pending'?'Ootab kinnitamist':company.status==='rejected'?'Tagasi lükatud':'Mustand'}</span></div><CompanyProfileForm key={company.id} initial={profile}/></PortalShell>;
}
