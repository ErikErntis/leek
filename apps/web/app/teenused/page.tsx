import { Search, SlidersHorizontal } from 'lucide-react';
import { catalogPageSize, catalogSortSchema, companyDisplayName, formatServicePrice, municipalities,
 serviceCategories, serviceCatalogFiltersSchema, servicePricingLabels } from '@leek/contracts';
import { ServiceCards } from '../../components/service-detail';
import { CatalogSortControl, CatalogFiltersPanel } from '../../components/catalog-controls';
import { getPublicServices } from '../../lib/services';
import '../catalog.css';

export const metadata = { title: 'Teenused' };
type Params = Record<string, string | string[] | undefined>;
const first = (value: Params[string]) => typeof value === 'string' ? value : value?.[0] ?? '';
const many = (value: Params[string]) => typeof value === 'string' ? [value] : value ?? [];

function catalogHref(params: URLSearchParams) {
 return params.size ? `/teenused?${params}` : '/teenused';
}

export default async function ServicesPage({ searchParams }: { searchParams: Promise<Params> }) {
 const params = await searchParams;
 const query = first(params.q).trim().slice(0, 120);
 const company = first(params.company).slice(0, 160);
 const rawOffset = Number(first(params.offset));
 const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 && rawOffset <= 100000 ? rawOffset : 0;
 const category = serviceCategories.filter(value => many(params.category).includes(value));
 const area = municipalities.filter(value => many(params.area).includes(value));
 const rawPricing = first(params.pricing);
 const pricing = rawPricing === 'fixed' || rawPricing === 'quote' ? rawPricing : undefined;
 const sort = catalogSortSchema.safeParse(first(params.sort)).data ?? 'recent';
 const min = first(params.min).slice(0, 20);
 const max = first(params.max).slice(0, 20);
 const validated = serviceCatalogFiltersSchema.safeParse({ category, area, pricing, sort, min: min || undefined, max: max || undefined });
 const active = new URLSearchParams();
 if (query) active.set('q', query);
 if (company) active.set('company', company);
 for (const value of category) active.append('category', value);
 for (const value of area) active.append('area', value);
 if (pricing) active.set('pricing', pricing);
 if (sort !== 'recent') active.set('sort', sort);
 if (validated.success) {
  if (min) active.set('min', min);
  if (max) active.set('max', max);
 }
 const { items, hasMore, companies = [] } = await getPublicServices(query, company, offset, active);
 const companyOptions = [...companies].sort((a, b) => companyDisplayName(a).localeCompare(companyDisplayName(b), 'et'));
 const selectedCompany = companyOptions.find(option => option.slug === company);
 const pageHref = (next: number) => {
  const target = new URLSearchParams(active);
  if (next > 0) target.set('offset', String(next));
  return catalogHref(target);
 };
 const reset = new URLSearchParams();
 if (query) reset.set('q', query);
 if (sort !== 'recent') reset.set('sort', sort);
 const chips = [
  ...category.map(value => ({ key: 'category', value, label: value })),
  ...area.map(value => ({ key: 'area', value, label: value })),
  ...(pricing ? [{ key: 'pricing', value: pricing, label: servicePricingLabels[pricing] }] : []),
  ...(company ? [{ key: 'company', value: company, label: selectedCompany ? companyDisplayName(selectedCompany) : company }] : []),
 ];
 if (validated.success && validated.data.min !== undefined) chips.push({ key: 'min', value: min, label: `Alates ${formatServicePrice(validated.data.min)}` });
 if (validated.success && validated.data.max !== undefined) chips.push({ key: 'max', value: max, label: `Kuni ${formatServicePrice(validated.data.max)}` });

 return <div className="container service-page listing-catalog">
  <h1>Teenused</h1>
  <form action="/teenused" method="get" key={`${active}:${min}:${max}`}>
   <div className="catalog-search" role="search">
    <label><Search size={19} aria-hidden="true" />
     <input name="q" type="search" aria-label="Otsi teenust või ettevõtet" defaultValue={query} maxLength={120}
      placeholder="Otsi teenust või ettevõtet" />
    </label>
    <button className="button" type="submit">Otsi</button>
   </div>
   <div className="catalog-layout">
    <CatalogFiltersPanel count={chips.length} label="Teenusefiltrid" invalidPrice={!validated.success}>
     <div className="catalog-filter-heading">
      <h2><SlidersHorizontal size={17} aria-hidden="true" /> Filtrid</h2>
      {(chips.length > 0 || !validated.success) && <a className="text-link" href={catalogHref(reset)}>Tühjenda</a>}
     </div>
     <fieldset><legend>Kategooria</legend>
      {serviceCategories.map(value => <label className="catalog-option" key={value}>
       <input name="category" type="checkbox" value={value} defaultChecked={category.includes(value)} /> {value}
      </label>)}
     </fieldset>
     <fieldset><legend>Teeninduspiirkond</legend>
      {municipalities.map(value => <label className="catalog-option" key={value}>
       <input name="area" type="checkbox" value={value} defaultChecked={area.includes(value)} /> {value}
      </label>)}
     </fieldset>
     <fieldset><legend>Hinnastus</legend>
      <select name="pricing" aria-label="Hinnastus" defaultValue={pricing ?? ''}>
       <option value="">Kõik hinnastused</option>
       <option value="fixed">{servicePricingLabels.fixed}</option>
       <option value="quote">{servicePricingLabels.quote}</option>
      </select>
     </fieldset>
     <fieldset><legend>Hind (€)</legend>
      <div className="catalog-prices">
       <label>Alates <input name="min" type="number" min="0" max="1000000" step="0.01" placeholder="0"
        defaultValue={min.replace(',', '.')} aria-invalid={!validated.success} aria-describedby={validated.success ? undefined : 'catalog-price-error'} /></label>
       <label>Kuni <input name="max" type="number" min="0" max="1000000" step="0.01" placeholder="—"
        defaultValue={max.replace(',', '.')} aria-invalid={!validated.success} aria-describedby={validated.success ? undefined : 'catalog-price-error'} /></label>
      </div>
      {!validated.success && <p className="catalog-error" id="catalog-price-error" role="alert">Kontrolli hinnavahemikku.</p>}
     </fieldset>
     <label className="catalog-company">Ettevõte
      <select name="company" defaultValue={company}>
       <option value="">Kõik ettevõtted</option>
       {company && !selectedCompany && <option value={company}>{company}</option>}
       {companyOptions.map(option => <option key={option.slug} value={option.slug}>{companyDisplayName(option)}</option>)}
      </select>
     </label>
     <button className="button secondary catalog-apply" type="submit">Rakenda filtrid</button>
    </CatalogFiltersPanel>

    <section className="catalog-results" aria-label="Otsingutulemused">
     <div className="catalog-toolbar">
      <p>{items.length ? `Teenused ${offset + 1}–${offset + items.length}` : '0 teenust'}</p>
      <CatalogSortControl value={sort} />
     </div>
     {chips.length > 0 && <ul className="catalog-chips" aria-label="Aktiivsed filtrid">
      {chips.map(({ key, value, label }) => {
       const target = new URLSearchParams(active);
       target.delete(key, value);
       return <li key={`${key}:${value}`}><a className="chip" href={catalogHref(target)} aria-label={`Eemalda filter ${label}`}>{label} <span aria-hidden="true">×</span></a></li>;
      })}
     </ul>}
     {items.length ? <ServiceCards items={items} catalog /> : <div className="panel catalog-empty">
      <h2>Teenuseid ei leitud</h2>
      <p className="muted">{pricing === 'quote' && validated.success && (min || max) ? 'Pakkumise alusel teenuste nägemiseks eemalda hinnavahemik.' : query || chips.length ? 'Proovi teist otsingusõna või muuda filtreid.' : 'Sellel lehel pole praegu teenuseid.'}</p>
      {(query || chips.length > 0 || offset > 0) && <a className="button secondary" href="/teenused">Kuva kõik teenused</a>}
     </div>}
     {(offset > 0 || hasMore && offset + catalogPageSize <= 100000) &&
      <nav className="service-pagination" aria-label="Teenuste leheküljed">
       {offset > 0 && <a className="button secondary" href={pageHref(Math.max(0, offset - catalogPageSize))}>Eelmised teenused</a>}
       {hasMore && offset + catalogPageSize <= 100000 && <a className="button secondary" href={pageHref(offset + catalogPageSize)}>Järgmised teenused</a>}
      </nav>}
    </section>
   </div>
  </form>
 </div>;
}
