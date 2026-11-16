'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import type { CatalogSort } from '@leek/contracts';

export function CatalogFiltersPanel({ count, children, label, invalidPrice = false }: {
 count: number; children: ReactNode; label: string; invalidPrice?: boolean;
}) {
 const [open, setOpen] = useState(invalidPrice);
 const panelId = useId();
 return <aside className="catalog-filters panel" data-open={open} aria-label={label}>
  <button className="catalog-mobile-toggle button secondary" type="button" aria-expanded={open}
   aria-controls={panelId} onClick={() => setOpen(!open)}>
   <SlidersHorizontal size={17} aria-hidden="true" /> Filtrid{count > 0 && ` (${count})`}
  </button>
  <div id={panelId}>{children}</div>
 </aside>;
}

export function CatalogSortControl({ value }: { value: CatalogSort }) {
 return <label className="catalog-sort">Sordi
  <select name="sort" defaultValue={value} onChange={event => event.currentTarget.form?.requestSubmit()}>
   <option value="recent">Viimati uuendatud</option>
   <option value="price-asc">Hind kasvavalt</option>
   <option value="price-desc">Hind kahanevalt</option>
   <option value="name">Nimi A–Z</option>
  </select>
 </label>;
}
