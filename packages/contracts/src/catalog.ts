import { z } from 'zod';

export const catalogPageSize = 40;
export const catalogSortSchema = z.enum(['recent', 'price-asc', 'price-desc', 'name']);
export type CatalogSort = z.infer<typeof catalogSortSchema>;
export type CatalogCompany = { slug: string; name: string; brandName: string };

const catalogPrice = z.string().regex(/^\d{1,7}(?:[.,]\d{1,2})?$/)
 .transform(value => Math.round(Number(value.replace(',', '.')) * 100))
 .pipe(z.number().int().min(0).max(100_000_000));

export const catalogPriceRangeSchema = z.object({
 min: catalogPrice.optional(),
 max: catalogPrice.optional(),
}).refine(({ min, max }) => min === undefined || max === undefined || min <= max);
