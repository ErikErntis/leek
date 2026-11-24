import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoData } from '@leek/contracts/demo';
import { blankWork, jobDetails, parseWorkFilters, publicProjection, workCatalog, workFiltersQuery, type Job } from '@leek/contracts';

const company = { ...demoData.companies[0]!, status: 'published' as const };
const now = Date.parse('2030-01-01T00:00:00Z');
function job(id: string, patch: Partial<NonNullable<Job['details']>> = {}, other: Partial<Job> = {}): Job {
 const details = { ...blankWork('job'), title: 'Laotöötaja', municipality: 'Keila linn' as const, description: 'Korralik töö kohalikus ettevõttes.', deadline: '2030-03-01', category: 'Transport ja logistika' as const, ...patch };
 return { id, slug: id, companyId: company.id, title: details.title, municipality: details.municipality, description: details.description, type: 'Täistööaeg', details, expiresAt: '2030-03-01T21:59:59.999Z', publishedAt: '2029-12-01T00:00:00Z', status: 'published', ...other };
}
test('work facets include live listings only and respond to other selections while keeping removable zero choices', () => {
 const jobs = [job('a'), job('b', { title: 'Ehitusabiline', kind: 'gig', category: 'Ehitus ja remont', payUnit: 'task', municipality: 'Lääne-Harju vald' }),
  job('draft', { category: 'Muu' }, { status: 'pending' }), job('expired', { category: 'Muu' }, { expiresAt: '2020-01-01T00:00:00Z' }),
  job('hidden', { category: 'Muu' }, { companyId: 'unpublished-company' })];
 const catalog = (query: Record<string, string | string[]>) => workCatalog(jobs, [company], parseWorkFilters(query), now);
 assert.equal(catalog({}).total, 2);
 assert.deepEqual(catalog({}).facets.category.map(x => x.value), ['Ehitus ja remont', 'Transport ja logistika']);
 assert.equal(catalog({ kind: 'gig' }).facets.category.some(x => x.value === 'Transport ja logistika'), false);
 const filtered = catalog({ category: 'Ehitus ja remont' });
 assert.equal(filtered.total, 1);
 assert.deepEqual(filtered.facets.municipality, [{ value: 'Lääne-Harju vald', count: 1 }]);
 assert.equal(filtered.facets.category.find(x => x.value === 'Transport ja logistika')?.count, 1);
 const none = catalog({ q: 'pole olemas', category: 'Ehitus ja remont' });
 assert.equal(none.total, 0);
 assert.deepEqual(none.facets.category, [{ value: 'Ehitus ja remont', count: 0 }]);
 assert.equal(none.facets.mode.length, 0);
 assert.equal(catalog({ q: 'EHITUS' }).total, 1);
 assert.equal(catalog({ category: ['Ehitus ja remont', 'Transport ja logistika'] }).total, 2);
 assert.equal(catalog({ municipality: 'Keila linn', mode: 'remote' }).total, 0);
});
test('work filters roundtrip in URLs and pagination clamps after listings disappear', () => {
 const filters = parseWorkFilters({ q: '  auto  ', category: ['Ehitus ja remont', 'Ehitus ja remont'], kind: 'gig', page: '99999', sort: 'deadline' });
 assert.equal(filters.q, 'auto'); assert.equal(filters.category.length, 1);
 const query = new URLSearchParams(workFiltersQuery(filters));
 const decoded = parseWorkFilters({ q: query.get('q')!, category: query.getAll('category'), kind: query.get('kind')!, page: query.get('page')!, sort: query.get('sort')! });
 assert.deepEqual(decoded, filters);
 const result = workCatalog(Array.from({ length: 14 }, (_, i) => job(String(i))), [company], parseWorkFilters({ page: '999' }), now);
 assert.equal(result.page, 2); assert.equal(result.items.length, 2);
 assert.equal(parseWorkFilters({ page: '-1', kind: 'invalid' }).page, 1);
 assert.equal(parseWorkFilters({ page: '-1', kind: 'invalid' }).kind, '');
});
test('public contract exposes approved details and strips draft fields; legacy listings still have sensible defaults', () => {
 const pendingDetails = { ...blankWork('gig'), title: 'Private draft' };
 const publicJob = job('af6e9bc6-9393-4899-aae0-eef82b499110');
 const data = publicProjection({ companies: [company], jobs: [{ ...publicJob, content: pendingDetails } as Job], offers: [], source: 'database' }, now);
 assert.equal(data.jobs[0]!.details!.title, 'Laotöötaja');
 assert.equal('content' in data.jobs[0]!, false);
 const legacy = jobDetails({ ...publicJob, details: undefined, type: 'Tööamps' });
 assert.equal(legacy.kind, 'gig'); assert.equal(legacy.title, publicJob.title);
});
