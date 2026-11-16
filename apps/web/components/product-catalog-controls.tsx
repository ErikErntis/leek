'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { ProductCatalogFilters } from '@leek/contracts';

export function ProductFiltersPanel({ count, children }: { count: number; children: ReactNode }) {
 const [open, setOpen] = useState(false);
 return <aside className="catalog-filters panel" data-open={open} aria-label="Tootefiltrid">
  <button className="catalog-mobile-toggle button secondary" type="button" aria-expanded={open}
   aria-controls="catalog-filter-fields" onClick={() => setOpen(!open)}>
   <SlidersHorizontal size={17} aria-hidden="true" /> Filtrid{count > 0 && ` (${count})`}
  </button>
  <div id="catalog-filter-fields">{children}</div>
 </aside>;
}

export function ProductCatalogSort({ value }: { value: ProductCatalogFilters['sort'] }) {
 return <label className="catalog-sort">Sordi
  <select name="sort" defaultValue={value} onChange={event => event.currentTarget.form?.requestSubmit()}>
   <option value="recent">Viimati uuendatud</option>
   <option value="price-asc">Hind kasvavalt</option>
   <option value="price-desc">Hind kahanevalt</option>
   <option value="name">Nimi A–Z</option>
  </select>
 </label>;
}
