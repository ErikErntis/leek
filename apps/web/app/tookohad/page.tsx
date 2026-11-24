import { Search, MapPin, ArrowRight } from 'lucide-react';
import { getSiteContent } from '../../lib/site-content';
import { getPublicData } from '../../lib/data';
import { parseWorkFilters, publicProjection, workCatalog, workFiltersQuery, workFacetKeys, workModes, workLoads, type WorkFacetKey } from '@leek/contracts';
import { WorkCard } from '../../components/work/work-card';
import { WorkSort } from '../../components/work/work-actions';
import { CatalogFiltersPanel } from '../../components/catalog-controls';
import './work.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tööpakkumised Loode-Eestis', alternates: { canonical: '/tookohad' } };
const labels: Record<WorkFacetKey, string> = { category: 'Töövaldkond', municipality: 'Asukoht', mode: 'Töökorraldus', load: 'Koormus' };
export default async function Jobs({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
 const [raw, source, content] = await Promise.all([searchParams, getPublicData(), getSiteContent()]);
 const data = publicProjection(source), filters = parseWorkFilters(raw);
 const catalog = workCatalog(data.jobs, data.companies, filters);
 const active = workFacetKeys.reduce((n, key) => n + filters[key].length, 0);
 const employers = new Map(data.companies.map(c => [c.id, c]));
 return <div className="container work-page">
  <form action="/tookohad" method="get">
   <section className="work-intro"><span className="eyebrow">{content.vacanciesEyebrow}</span><h1>Hea töö on lähemal, kui arvad.</h1><p>Leia uus töökoht või paindlik tööamps oma kodukandis.</p><svg className="work-landscape" viewBox="0 0 320 110" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M2 83Q32 58 65 80T140 78Q185 28 230 70T318 83M5 100q48-15 92 0t89 0 125 0M183 54l5-38h13l5 38M183 16h24l-12-9zM195 7V1M263 67V23m-14 29 14-12 14 12m-23-14 9-12 9 12M22 45q9-10 18 0m19-12q9-10 18 0" /></svg></section>
   <div className="work-search"><label><Search size={21} aria-hidden="true" /><span className="sr-only">Otsi tööd</span><input name="q" defaultValue={filters.q} maxLength={120} placeholder="Amet, märksõna või ettevõte" /></label><button className="button" type="submit">Otsi tööd <ArrowRight size={18} /></button></div>
   <nav className="work-tabs" aria-label="Kuulutuse liik">{[['', 'Kõik', catalog.kindCounts.all], ['job', 'Tööpakkumised', catalog.kindCounts.job], ['gig', 'Tööampsud', catalog.kindCounts.gig]].filter(([kind, , count]) => !kind || Number(count) > 0 || kind === filters.kind).map(([kind, label, count]) => <a key={kind} href={`/tookohad${workFiltersQuery(filters, { kind: String(kind), page: 1 })}`} aria-current={filters.kind === kind ? 'page' : undefined}>{label} <span>{count}</span></a>)}</nav>
   {filters.kind && <input type="hidden" name="kind" value={filters.kind} />}
   <div className="work-layout">
    <CatalogFiltersPanel count={active} label="Töökuulutuste filtrid"><h2>Filtrid</h2>
     {workFacetKeys.map(key => catalog.facets[key].length > 0 && <fieldset key={key}><legend>{labels[key]}</legend>{catalog.facets[key].map(({ value, count }) => <label className="work-filter-option" key={value}><input type="checkbox" name={key} value={value} defaultChecked={filters[key].includes(value)} /><span>{key === 'mode' ? workModes[value as keyof typeof workModes] ?? value : key === 'load' ? workLoads[value as keyof typeof workLoads] ?? value : value}</span><small>{count}</small></label>)}</fieldset>)}
     {workFacetKeys.every(key => !catalog.facets[key].length) && <p className="muted">Filtrid ilmuvad koos sobivate kuulutustega.</p>}
     <button type="submit" className="button work-filter-submit">Näita tulemusi</button><a className="text-link" href="/tookohad">Tühjenda filtrid</a>
    </CatalogFiltersPanel>
    <section className="work-results" aria-label="Töökuulutused"><header><h2>{catalog.total} {catalog.total === 1 ? 'võimalus' : 'võimalust'} sinu lähedal</h2><WorkSort value={filters.sort} /></header>
     <div className="work-results-list">{catalog.items.map(job => <WorkCard key={job.id} job={job} company={employers.get(job.companyId)!} />)}</div>
     {!catalog.items.length && <div className="panel work-empty"><Search size={30} /><h2>{data.jobs.length ? 'Sobivaid kuulutusi ei leitud' : 'Uued võimalused lisanduvad peagi'}</h2><p>{data.jobs.length ? 'Proovi teist märksõna või eemalda mõni filter.' : 'Praegu ei ole avaldatud ühtegi kehtivat tööpakkumist ega tööampsu.'}</p><a className="button secondary" href="/tookohad">Vaata kõiki kuulutusi</a></div>}
     {catalog.pages > 1 && <nav className="work-pagination" aria-label="Töökuulutuste leheküljed">{catalog.page > 1 && <a href={`/tookohad${workFiltersQuery(filters, { page: catalog.page - 1 })}`}>← Eelmised</a>}<span>Leht {catalog.page} / {catalog.pages}</span>{catalog.page < catalog.pages && <a href={`/tookohad${workFiltersQuery(filters, { page: catalog.page + 1 })}`}>Järgmised →</a>}</nav>}
    </section>
   </div>
  </form>
 </div>;
}
