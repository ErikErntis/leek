import { WorkspaceShell } from '@leek/ui';
import { workKinds, workLoads, workModes, workPayLabel, type CompanyWork } from '@leek/contracts';
import { adminFetch } from '../../lib/data';
import { AdminLogout } from '../../components/admin-auth';
import { WorkReviewForm } from '../../components/work-review-form';

export const metadata = { title: 'Töökuulutuste ülevaatus' };
type Queue = { items: { listing: CompanyWork; companyName: string }[]; hasMore: boolean };
const date = (value: string) => value ? new Intl.DateTimeFormat('et-EE', { timeZone: 'Europe/Tallinn' }).format(new Date(`${value}T12:00:00Z`)) : 'Määramata';

export default async function WorkReviews({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
 const query = await searchParams;
 const value = Number(query.offset ?? 0);
 const offset = Number.isSafeInteger(value) && value >= 0 && value <= 100000 ? value : 0;
 const data = await adminFetch(`/v1/admin/work?offset=${offset}`) as Queue;
 return <WorkspaceShell kind="admin" active="/tookuulutused" siteUrl={process.env.SITE_URL} demo={false} actions={<AdminLogout />}>
  <div className="workspace-heading"><div><h1>Töökuulutuste ülevaatus</h1><p>Vaata üle tööpakkumised ja tööampsud. Kinnitamisel avaldatakse esitatud versioon.</p></div></div>
  <p className="muted">Vanemad taotlused on eespool. Lehel kuni 40 kuulutust.</p>
  {!data.items.length && <section className="panel empty-state"><h2>Ootel kuulutusi pole</h2><p>Esitatud tööpakkumised ja tööampsud ilmuvad siia ülevaatuseks.</p></section>}
  <div className="work-review-list">{data.items.map(({ listing, companyName }) => {
   const c = listing.content;
   return <article className="panel work-review-card" key={`${listing.id}-${listing.version}`}>
    <header><span className="badge orange">{workKinds[c.kind]}</span><h2>{c.title}</h2><p>{companyName} · {c.category}</p><small className="muted">Esitatud {new Intl.DateTimeFormat('et-EE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Tallinn' }).format(new Date(listing.updatedAt))}</small></header>
    <div className="admin-detail-grid"><div>
     {listing.published && <p className="notice-panel">Varasem kinnitatud versioon on praegu avalik. Selle andmed muutuvad alles uue versiooni kinnitamisel.</p>}
     <dl className="admin-data">{[
      ['Asukoht', [c.municipality, c.address].filter(Boolean).join(', ') || 'Määramata'],
      ['Töökorraldus', workModes[c.mode]], ['Koormus', workLoads[c.load]],
      ['Tasu', workPayLabel(c)], ['Vastamise tähtaeg', date(c.deadline)],
      ...(c.kind === 'gig' ? [['Algus', date(c.startsOn)], ['Lõpp', date(c.endsOn)], ['Kestus', c.duration || 'Kokkuleppel'], ['Inimeste arv', String(c.people)]] : []),
      ['Kandideerimine', c.contactMethod === 'portal' ? 'LEEKi portaalis' : c.contactMethod === 'email' ? c.contactEmail : c.contactUrl],
     ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
     <h3>Töö kirjeldus</h3><p className="admin-description">{c.description}</p>
     {c.requirements && <><h3>Nõudmised</h3><p className="admin-description">{c.requirements}</p></>}
     {c.benefits && <><h3>Tööandja pakub</h3><p className="admin-description">{c.benefits}</p></>}
    </div><aside><WorkReviewForm id={listing.id} version={listing.version} /></aside></div>
   </article>;
  })}</div>
  <nav className="admin-pagination" aria-label="Ülevaatuse leheküljed">
   {offset > 0 && <a className="text-link" href={`/tookuulutused?offset=${Math.max(0, offset - 40)}`}>← Eelmised</a>}
   {offset > 0 && !data.items.length && <a className="text-link" href="/tookuulutused">Tagasi algusesse</a>}
   {data.hasMore && <a className="text-link" href={`/tookuulutused?offset=${offset + 40}`}>Järgmised →</a>}
  </nav>
 </WorkspaceShell>;
}
