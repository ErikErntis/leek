import { ServiceCards } from '../../components/service-detail';
import { getPublicServices } from '../../lib/services';

export const metadata = { title: 'Teenused' };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string; company?: string; offset?: string }> }) {
 const params = await searchParams;
 const query = typeof params.q === 'string' ? params.q.trim().slice(0, 120) : '';
 const company = typeof params.company === 'string' ? params.company.slice(0, 160) : '';
 const rawOffset = Number(params.offset);
 const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 && rawOffset <= 100000 ? rawOffset : 0;
 const { items, hasMore } = await getPublicServices(query, company, offset);
 const pageHref = (next: number) => `/teenused?${new URLSearchParams({ q: query, company, offset: String(next) })}`;
 return <div className="container service-page">
  <h1>Teenused</h1>
  <form className="service-search">
   <label>Otsi teenust<input name="q" defaultValue={query} maxLength={120} placeholder="Näiteks mööbli paigaldus" /></label>
   {company && <input type="hidden" name="company" value={company} />}
   <button className="button">Otsi</button>
  </form>
  {items.length ? <ServiceCards items={items} /> : <p className="muted">Teenuseid ei leitud.</p>}
  {(offset > 0 || hasMore) && <nav className="service-pagination" aria-label="Teenuste leheküljed">
   {offset > 0 && <a className="text-link" href={pageHref(Math.max(0, offset - 40))}>Eelmised teenused</a>}
   {hasMore && offset < 100000 && <a className="text-link" href={pageHref(offset + 40)}>Järgmised teenused</a>}
  </nav>}
 </div>;
}
