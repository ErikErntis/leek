import { Search, SlidersHorizontal } from 'lucide-react';
import { companyDisplayName, formatServicePrice, productAvailability, productCatalogFiltersSchema,
 productCatalogPageSize, productCategories, type ProductAvailability } from '@leek/contracts';
import { ProductCards } from '../../components/product-cards';
import { ProductCatalogSort, ProductFiltersPanel } from '../../components/product-catalog-controls';
import { getPublicProducts } from '../../lib/products';
import './catalog.css';

export const metadata = { title: 'Tooted' };
type Params = Record<string, string | string[] | undefined>;
const first = (value: Params[string]) => typeof value === 'string' ? value : value?.[0] ?? '';
const many = (value: Params[string]) => typeof value === 'string' ? [value] : value ?? [];

function catalogHref(params: URLSearchParams) {
 return params.size ? `/tooted?${params}` : '/tooted';
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
 const params = await searchParams;
 const query = first(params.q).trim().slice(0, 120);
 const company = first(params.company).slice(0, 160);
 const rawOffset = Number(first(params.offset));
 const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 && rawOffset <= 100000 ? rawOffset : 0;
 const category = productCategories.filter(value => many(params.category).includes(value));
 const availability = (Object.keys(productAvailability) as ProductAvailability[]).filter(value => many(params.availability).includes(value));
 const rawSort = first(params.sort);
 const sort = rawSort === 'price-asc' || rawSort === 'price-desc' || rawSort === 'name' ? rawSort : 'recent';
 const min = first(params.min).slice(0, 20);
 const max = first(params.max).slice(0, 20);
 const validated = productCatalogFiltersSchema.safeParse({ category, availability, sort, min: min || undefined, max: max || undefined });
 const active = new URLSearchParams();
 if (query) active.set('q', query);
 if (company) active.set('company', company);
 for (const value of category) active.append('category', value);
 for (const value of availability) active.append('availability', value);
 if (sort !== 'recent') active.set('sort', sort);
 if (validated.success) {
  if (min) active.set('min', min);
  if (max) active.set('max', max);
 }
 const { items, hasMore, companies = [] } = await getPublicProducts(query, company, offset, active);
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
  ...availability.map(value => ({ key: 'availability', value, label: productAvailability[value] })),
  ...(company ? [{ key: 'company', value: company, label: selectedCompany ? companyDisplayName(selectedCompany) : company }] : []),
 ];
 if (validated.success && validated.data.min !== undefined) chips.push({ key: 'min', value: min, label: `Alates ${formatServicePrice(validated.data.min)}` });
 if (validated.success && validated.data.max !== undefined) chips.push({ key: 'max', value: max, label: `Kuni ${formatServicePrice(validated.data.max)}` });

 return <div className="container service-page product-catalog">
  <h1>Tooted</h1>
  <form action="/tooted" method="get" key={`${active}:${min}:${max}`}>
   <div className="catalog-search" role="search">
    <label><Search size={19} aria-hidden="true" />
     <input name="q" type="search" aria-label="Otsi toodet või ettevõtet" defaultValue={query} maxLength={120}
      placeholder="Otsi toodet või ettevõtet" />
    </label>
    <button className="button" type="submit">Otsi</button>
   </div>
   <div className="catalog-layout">
    <ProductFiltersPanel count={chips.length}>
     <div className="catalog-filter-heading">
      <h2><SlidersHorizontal size={17} aria-hidden="true" /> Filtrid</h2>
      {(chips.length > 0 || !validated.success) && <a className="text-link" href={catalogHref(reset)}>Tühjenda</a>}
     </div>
     <fieldset><legend>Kategooria</legend>
      {productCategories.map(value => <label className="catalog-option" key={value}>
       <input name="category" type="checkbox" value={value} defaultChecked={category.includes(value)} /> {value}
      </label>)}
     </fieldset>
     <fieldset><legend>Saadavus</legend>
      {(Object.entries(productAvailability) as [ProductAvailability, string][]).map(([value, title]) =>
       <label className="catalog-option" key={value}>
        <input name="availability" type="checkbox" value={value} defaultChecked={availability.includes(value)} /> {title}
       </label>)}
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
    </ProductFiltersPanel>

    <section className="catalog-results" aria-label="Otsingutulemused">
     <div className="catalog-toolbar">
      <p>{items.length ? `Tooted ${offset + 1}–${offset + items.length}` : '0 toodet'}</p>
      <ProductCatalogSort value={sort} />
     </div>
     {chips.length > 0 && <ul className="catalog-chips" aria-label="Aktiivsed filtrid">
      {chips.map(({ key, value, label }) => {
       const target = new URLSearchParams(active);
       target.delete(key, value);
       return <li key={`${key}:${value}`}><a className="chip" href={catalogHref(target)} aria-label={`Eemalda filter ${label}`}>{label} <span aria-hidden="true">×</span></a></li>;
      })}
     </ul>}
     {items.length ? <ProductCards items={items} catalog /> : <div className="panel catalog-empty">
      <h2>Tooteid ei leitud</h2>
      <p className="muted">{query || chips.length ? 'Proovi teist otsingusõna või muuda filtreid.' : 'Sellel lehel pole praegu tooteid.'}</p>
      {(query || chips.length > 0 || offset > 0) && <a className="button secondary" href="/tooted">Kuva kõik tooted</a>}
     </div>}
     {(offset > 0 || hasMore && offset + productCatalogPageSize <= 100000) &&
      <nav className="service-pagination" aria-label="Toodete leheküljed">
       {offset > 0 && <a className="button secondary" href={pageHref(Math.max(0, offset - productCatalogPageSize))}>Eelmised tooted</a>}
       {hasMore && offset + productCatalogPageSize <= 100000 && <a className="button secondary" href={pageHref(offset + productCatalogPageSize)}>Järgmised tooted</a>}
      </nav>}
    </section>
   </div>
  </form>
 </div>;
}
