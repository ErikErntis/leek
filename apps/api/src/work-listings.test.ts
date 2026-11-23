import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as schema from '@leek/db/schema';
import { blankWork, workDeadline, workToday, workSubmitSchema, type WorkContent } from '@leek/contracts';
import { billingMigration } from '../../../packages/db/src/migrate-billing';
import { createApp, type AuthHandler } from './app';
import { createCompanyService } from './company-service';
import { createWorkListings } from './work-listings';

test('company work listings enforce premium ownership, preserve drafts, contact choices and live versions', async () => {
 const client = new PGlite();
 try {
  for (const file of ['0000_stormy_paibok', '0001_flaky_nebula', '0002_moaning_zarda']) {
   await client.exec(await readFile(new URL(`../../../packages/db/migrations/${file}.sql`, import.meta.url), 'utf8'));
  }
  await client.exec(billingMigration);
  await client.exec(await readFile(new URL('../../../packages/db/migrations/0005_company_work.sql', import.meta.url), 'utf8'));
  await client.exec(billingMigration);
  const db = drizzle(client, { schema }) as unknown as Parameters<typeof createWorkListings>[0];
  const [owner, outsider] = await db.insert(schema.users).values([
   { name: 'Owner', email: 'owner@work.test' }, { name: 'Other', email: 'other@work.test' },
  ]).returning();
  const [company, otherCompany] = await db.insert(schema.companies).values([
   { name: 'Töö Firma', slug: 'work', registrationCode: '12345678', category: 'Tootmine', municipality: 'Keila linn',
    website: '', email: 'work@test.ee', status: 'published', currentSubscription: 3, paidUntil: new Date(Date.now() + 30 * 86400000) },
   { name: 'Other', slug: 'other', registrationCode: '12345679', category: 'Tootmine', municipality: 'Keila linn',
    website: '', email: 'other@test.ee', status: 'published', currentSubscription: 3, paidUntil: new Date(Date.now() + 30 * 86400000) },
  ]).returning();
  await db.insert(schema.memberships).values([
   { companyId: company!.id, userId: owner!.id, role: 'owner' },
   { companyId: otherCompany!.id, userId: outsider!.id, role: 'owner' },
  ]);
  const auth = { api: { getSession: async ({ headers }: { headers: Headers }) => {
   const user = headers.get('cookie') === 'owner' ? owner : headers.get('cookie') === 'other' ? outsider : null;
   return user ? { user } : null;
  } } } as unknown as AuthHandler;
  const work = createWorkListings(db);
  const app = createApp(
   { check: async () => {}, readPublic: async () => ({ companies: [], jobs: [], offers: [], source: 'database' }) },
   ['https://web.test'], auth, createCompanyService(db), undefined, undefined, undefined, undefined, undefined, undefined, undefined, work,
  );
  const path = `/v1/my/companies/${company!.id}/work`;
  const request = (body?: unknown, cookie = 'owner', origin = 'https://web.test', url = path) => app.request(url, {
   method: body ? 'POST' : 'GET', headers: { cookie, origin, 'content-type': 'application/json' },
   body: body ? JSON.stringify(body) : undefined,
  });
  async function okay(response: Response) {
   assert.equal(response.status, 200, await response.clone().text());
   return response.json();
  }
  const nextMonth = workToday(new Date(Date.now() + 20 * 86400000));
  const content: WorkContent = {
   ...blankWork('job'), title: 'Laotöötaja', description: 'Komplekteerid tellimusi ja võtad kaupa vastu.',
   municipality: 'Keila linn', deadline: nextMonth, contactMethod: 'url', contactUrl: 'https://www.cvkeskus.ee/kuulutus',
  };
  const id = randomUUID();
  const draft = { id, version: null, action: 'draft', content: blankWork('job') };
  assert.equal((await request(undefined, '')).status, 401);
  assert.equal((await request(undefined, 'other')).status, 404);
  assert.equal((await request(draft, 'owner', 'https://foreign.test')).status, 403);
  assert.equal((await request(draft, 'other')).status, 404);
  for (const currentSubscription of [1, 2, null]) {
   await db.update(schema.companies).set({ currentSubscription }).where(eq(schema.companies.id, company!.id));
   assert.equal((await request(draft)).status, 403);
  }
  await db.update(schema.companies).set({ currentSubscription: 3, paidUntil: new Date(0) }).where(eq(schema.companies.id, company!.id));
  assert.equal((await request(draft)).status, 403);
  assert.equal((await okay(await request())).canManage, false);
  await db.update(schema.companies).set({ paidUntil: new Date(Date.now() + 86400000), status: 'pending' }).where(eq(schema.companies.id, company!.id));
  assert.equal((await request(draft)).status, 403);
  await db.update(schema.companies).set({ status: 'published' }).where(eq(schema.companies.id, company!.id));
  const saved = await okay(await request(draft));
  assert.equal(saved.status, 'draft');
  assert.equal(saved.version, 0);
  assert.equal((await request({ ...draft, action: 'submit', version: saved.version })).status, 400);
  const published = await okay(await request({ ...draft, action: 'submit', version: saved.version, content }));
  assert.equal(published.status, 'pending');
  assert.equal((await request({ ...draft, version: published.version, content })).status, 409);
  const withdrawn = await okay(await request({ id, version: published.version, action: 'withdraw' }));
  assert.equal(withdrawn.status, 'draft');
  assert.equal((await request({ id, version: withdrawn.version, action: 'withdraw' })).status, 409);
  for (const contactUrl of ['javascript:alert(1)', 'http://example.com', 'https://user:password@example.com']) {
   assert.equal((await request({ id, version: withdrawn.version, action: 'submit', content: { ...content, contactUrl } })).status, 400);
  }
  const portal = await okay(await request({ id, version: withdrawn.version, action: 'draft', content: {
   ...content, contactMethod: 'portal', contactEmail: 'old@test.ee', contactUrl: 'https://old.test',
  } }));
  assert.equal(portal.content.contactEmail, '');
  assert.equal(portal.content.contactUrl, '');
  const contenders = await Promise.all([
   request({ id, version: portal.version, action: 'draft', content }),
   request({ id, version: portal.version, action: 'draft', content }),
  ]);
  assert.deepEqual(contenders.map(response => response.status).sort(), [200, 409]);
  const winner = await okay(contenders.find(response => response.status === 200)!);
  await db.update(schema.companies).set({ paidUntil: new Date(0) }).where(eq(schema.companies.id, company!.id));
  const closed = await okay(await request({ id, version: winner.version, action: 'close' }));
  assert.equal(closed.status, 'closed');
  await db.update(schema.companies).set({ paidUntil: new Date(Date.now() + 86400000) }).where(eq(schema.companies.id, company!.id));

  const legacyId = randomUUID();
  await db.insert(schema.jobs).values({
   id: legacyId, slug: 'legacy-work', companyId: company!.id, title: 'Algne kuulutus', municipality: 'Keila linn',
   type: 'Täistööaeg', description: 'Algne kirjeldus', expiresAt: workDeadline(nextMonth), status: 'published',
  });
  const legacy = (await okay(await request())).items.find((item: { id: string }) => item.id === legacyId);
  assert.equal(legacy.content.title, 'Algne kuulutus');
  assert.equal(legacy.status, 'published');
  const updated = await okay(await request({ id: legacyId, version: legacy.version, action: 'submit', content }));
  assert.equal(updated.published, true);
  const [live] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, legacyId));
  assert.equal(live!.title, 'Algne kuulutus');
  assert.equal(live!.status, 'published');
  assert.equal(live!.reviewState, 'pending');

  const gig: WorkContent = {
   ...blankWork('gig'), title: 'Kolimisabi', description: 'Vajame abilist töökoja kolimisel, töövahendid on kohapeal.',
   deadline: nextMonth, startsOn: nextMonth, endsOn: nextMonth, municipality: 'Keila linn', contactMethod: 'email', contactEmail: 'too@test.ee',
  };
  const gigId = randomUUID();
  const submittedGig = await okay(await request({ id: gigId, version: null, action: 'submit', content: gig }));
  assert.equal(submittedGig.content.kind, 'gig');
  assert.equal(submittedGig.status, 'pending');
  assert.equal(workSubmitSchema.safeParse({ ...gig, startsOn: '' }).success, false);
  assert.equal(workSubmitSchema.safeParse({ ...gig, endsOn: '2020-01-01' }).success, false);
  assert.equal(workSubmitSchema.safeParse({ ...gig, payMinCents: 5000, payMaxCents: 1000 }).success, false);
  assert.equal((await request({ id: gigId, version: submittedGig.version, action: 'close' }, 'other', 'https://web.test', `/v1/my/companies/${otherCompany!.id}/work`)).status, 409);
  assert.equal((await okay(await request())).items.find((item: { id: string }) => item.id === gigId).status, 'pending');
  assert.equal(workDeadline('2027-01-10').toISOString(), '2027-01-10T21:59:59.999Z');
  assert.equal(workDeadline('2027-07-10').toISOString(), '2027-07-10T20:59:59.999Z');
 } finally { await client.close(); }
});
