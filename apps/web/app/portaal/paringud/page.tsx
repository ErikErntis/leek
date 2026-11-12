import { InquiryList } from '../../../components/inquiries/inbox';
import { PortalShell } from '../../../components/portal/portal-shell';
import { getInquiries } from '../../../lib/inquiries';
import { inboxHref, inboxOffset } from '../../../lib/inquiry-links';
import { portalData } from '../../../lib/portal';

export default async function CompanyInboxPage({ searchParams }: { searchParams: Promise<{ company?: string; offset?: string }> }) {
 const [data, query] = await Promise.all([portalData(), searchParams]);
 const company = data.companies.find(item => item.id === query.company) ?? data.companies[0];
 const offset = inboxOffset(query.offset);
 const page = company ? await getInquiries(company.id, offset) : null;
 return <PortalShell company={company} active="/paringud">
  <div className="workspace-heading"><h1>Päringud</h1></div>
  {data.companies.length > 1 && <nav className="inbox-actions inbox-companies" aria-label="Ettevõtte päringud">{data.companies.map(item =>
   <a key={item.id} className="button secondary" href={inboxHref(item.id)} aria-current={item.id === company?.id ? 'page' : undefined}>{item.name}</a>
  )}</nav>}
  {page ? <InquiryList {...page} company={company!.id} offset={offset} /> : <section className="panel"><p>Selle konto all pole veel ettevõtet.</p></section>}
 </PortalShell>;
}
