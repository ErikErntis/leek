import type { Company, Job } from './index';
import { blankWork, workLoads, workToday, type WorkContent } from './work';

export type WorkFilters = { q: string; kind: string; category: string[]; municipality: string[]; mode: string[]; load: string[]; sort: string; page: number };
export const workFacetKeys = ['category', 'municipality', 'mode', 'load'] as const;
export type WorkFacetKey = typeof workFacetKeys[number];
export function parseWorkFilters(query: Record<string, string | string[] | undefined>): WorkFilters {
 const single = (key: string) => typeof query[key] === 'string' ? query[key] as string : '';
 const many = (key: string) => [...new Set((Array.isArray(query[key]) ? query[key] : query[key] ? [query[key]] : []) as string[])].filter(x => x.length <= 100).slice(0, 30);
 const page = Number(single('page') || 1);
 return { q: single('q').trim().slice(0, 120), kind: ['job', 'gig'].includes(single('kind')) ? single('kind') : '',
  category: many('category'), municipality: many('municipality'), mode: many('mode'), load: many('load'),
  sort: ['recent', 'deadline'].includes(single('sort')) ? single('sort') : 'recent',
  page: Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1 };
}
export function jobDetails(job: Job): WorkContent {
 if (job.details) return job.details;
 return { ...blankWork(job.type === 'Tööamps' ? 'gig' : 'job'), title: job.title, description: job.description,
  municipality: job.municipality as WorkContent['municipality'],
  load: (Object.entries(workLoads).find(([, label]) => label === job.type)?.[0] ?? 'full') as WorkContent['load'],
  deadline: workToday(new Date(job.expiresAt)) };
}
export function workCatalog(jobs: Job[], companies: Company[], filters: WorkFilters, now = Date.now()) {
 const employers = new Map(companies.filter(c => c.status === 'published').map(c => [c.id, c]));
 const all = jobs.filter(j => j.status === 'published' && Date.parse(j.expiresAt) > now && employers.has(j.companyId));
 const matches = (j: Job, except?: WorkFacetKey | 'kind') => {
  const c = jobDetails(j), employer = employers.get(j.companyId)!;
  return (except === 'kind' || !filters.kind || c.kind === filters.kind) &&
   (!filters.q || [j.title, j.description, c.requirements, employer.name, employer.brandName].join(' ').toLocaleLowerCase('et').includes(filters.q.toLocaleLowerCase('et'))) &&
   workFacetKeys.every(key => key === except || !filters[key].length || filters[key].includes(c[key]));
 };
 const facets = Object.fromEntries(workFacetKeys.map(key => {
  const counts = new Map<string, number>();
  for (const job of all.filter(j => matches(j, key))) { const value = jobDetails(job)[key]; if (value) counts.set(value, (counts.get(value) ?? 0) + 1); }
  for (const value of filters[key]) if (!counts.has(value)) counts.set(value, 0);
  return [key, [...counts].sort(([a], [b]) => a.localeCompare(b, 'et')).map(([value, count]) => ({ value, count }))];
 })) as Record<WorkFacetKey, { value: string; count: number }[]>;
 const kinds = all.filter(j => matches(j, 'kind'));
 const kindCounts = { all: kinds.length, job: kinds.filter(j => jobDetails(j).kind === 'job').length, gig: kinds.filter(j => jobDetails(j).kind === 'gig').length };
 const matched = all.filter(j => matches(j)).sort((a, b) => {
  if (filters.sort === 'deadline') return Date.parse(a.expiresAt) - Date.parse(b.expiresAt) || a.id.localeCompare(b.id);
  return Date.parse(b.publishedAt ?? b.expiresAt) - Date.parse(a.publishedAt ?? a.expiresAt) || a.id.localeCompare(b.id);
 });
 const pageSize = 12, pages = Math.max(1, Math.ceil(matched.length / pageSize)), page = Math.min(filters.page, pages);
 return { items: matched.slice((page - 1) * pageSize, page * pageSize), total: matched.length, facets, kindCounts, page, pages };
}
export function workFiltersQuery(filters: WorkFilters, changes: Partial<WorkFilters> = {}) {
 const f = { ...filters, ...changes }, query = new URLSearchParams();
 if (f.q) query.set('q', f.q); if (f.kind) query.set('kind', f.kind);
 for (const key of workFacetKeys) for (const value of f[key]) query.append(key, value);
 if (f.sort !== 'recent') query.set('sort', f.sort); if (f.page > 1) query.set('page', String(f.page));
 return query.toString() ? `?${query}` : '';
}
