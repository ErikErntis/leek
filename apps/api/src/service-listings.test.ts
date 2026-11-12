import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as schema from '@leek/db/schema';
import { createAuth } from '@leek/auth/server';
import type { ServiceContent } from '@leek/contracts';
import { billingMigration } from '../../../packages/db/src/migrate-billing';
import { createApp } from './app';
import { createCompanyService } from './company-service';
import { createMediaRoutes } from './media';
import { createServiceListings } from './service-listings';

test('service listings preserve the approved version, enforce ownership and protect private photos', async () => {
 const client = new PGlite();
 try {
  for (const migration of ['0000_stormy_paibok.sql', '0001_flaky_nebula.sql', '0002_moaning_zarda.sql']) {
   await client.exec(await readFile(new URL(`../../../packages/db/migrations/${migration}`, import.meta.url), 'utf8'));
  }
  await client.exec(billingMigration);
  await client.exec(billingMigration);
  const db = drizzle(client, { schema }) as unknown as Parameters<typeof createAuth>[0];
  const origins = ['https://web.test', 'https://admin.test'];
  const auth = createAuth(db, { publicURL: origins[0]!, adminURL: origins[1]!, secret: 'local-tests-only-secret-long-enough-for-better-auth' });
  Object.assign(process.env, {
   AWS_ENDPOINT_URL: 'https://bucket.test', AWS_S3_BUCKET_NAME: 'test', AWS_ACCESS_KEY_ID: 'test',
   AWS_SECRET_ACCESS_KEY: 'test-secret', AWS_DEFAULT_REGION: 'auto',
  });
  const app = createApp(
   { check: async () => {}, readPublic: async () => ({ companies: [], jobs: [], offers: [], source: 'database' }) },
   origins, auth, createCompanyService(db), undefined, undefined,
   createMediaRoutes(db, auth, origins), createServiceListings(db),
  );
  const request = (path: string, body?: unknown, cookie?: string, origin = origins[0]!) => app.request(`https://api.test${path}`, {
   method: body === undefined ? 'GET' : 'POST',
   headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
   body: body === undefined ? undefined : JSON.stringify(body),
  });
  async function signup(email: string) {
   const response = await request('/api/auth/sign-up/email', { name: 'Test Kasutaja', email, password: 'Test-password-42' });
   assert.equal(response.status, 200);
   const { user } = await response.json();
   const cookie = response.headers.getSetCookie().find(value => value.startsWith('__Secure-leek.session_token='))!.split(';')[0]!;
   return { id: user.id as string, cookie };
  }
  async function successful(response: Response) {
   assert.equal(response.status, 200, await response.clone().text());
   return response.json();
  }
  const owner = await signup('owner@services.test');
  const other = await signup('other@services.test');
  const admin = await signup('admin@services.test');
  await db.update(schema.users).set({ role: 'admin' }).where(eq(schema.users.id, admin.id));
  const [company] = await db.insert(schema.companies).values({
   slug: 'vello', name: 'Vello Puit OÜ', registrationCode: '12345678', status: 'published',
   category: 'Tootmine', municipality: 'Lääne-Harju vald', email: 'tere@services.test', website: '',
  }).returning();
  const companyId = company!.id;
  await db.insert(schema.memberships).values({ companyId, userId: owner.id, role: 'owner' });
  const [photo] = await db.insert(schema.companyMedia).values({ companyId, kind: 'image', key: 'sample.webp' }).returning();
  const photoPath = `/v1/media/${photo!.id}`;
  const id = randomUUID();
  const ownerPath = `/v1/my/companies/${companyId}/services`;
  const publicPath = `/v1/services/${id}`;
  const reviewPath = `/v1/admin/services/${id}/review`;
  const content: ServiceContent = {
   title: 'Mööbli paigaldus', category: 'Mööbel ja sisustus', area: 'Lääne-Harju vald',
   description: 'Paigaldame mööblit kliendi juures.', pricing: 'fixed', priceCents: 6000, photo: `/api/media/${photo!.id}`,
  };
  const create = { id, version: null, action: 'draft', content };
  assert.equal((await request(ownerPath)).status, 401);
  assert.equal((await request(ownerPath, create, other.cookie)).status, 404);
  assert.equal((await request(ownerPath, create, owner.cookie, 'https://foreign.test')).status, 403);
  const draft = await successful(await request(ownerPath, create, owner.cookie));
  assert.equal(draft.status, 'draft');
  assert.equal((await request(publicPath)).status, 404);
  assert.equal((await request(photoPath)).status, 404);
  assert.equal((await request(photoPath, undefined, owner.cookie)).status, 302);
  const submitted = await successful(await request(ownerPath, { ...create, version: draft.version, action: 'submit' }, owner.cookie));
  assert.equal((await request('/v1/admin/services', undefined, owner.cookie)).status, 403);
  const review = { decision: 'approve', version: submitted.version };
  const competing = await Promise.all([
   request(reviewPath, review, admin.cookie, origins[1]),
   request(reviewPath, review, admin.cookie, origins[1]),
  ]);
  assert.deepEqual(competing.map(response => response.status).sort(), [200, 409]);
  const approved = await successful(competing.find(response => response.ok)!);
  assert.equal((await successful(await request(publicPath))).title, content.title);
  assert.equal((await request(photoPath)).status, 302);
  const catalog = await successful(await request('/v1/services?q=m%C3%B6%C3%B6bli&company=vello'));
  assert.deepEqual(catalog.items.map((item: { id: string }) => item.id), [id]);
  const changed = await successful(await request(ownerPath, {
   ...create, version: approved.version, action: 'submit', content: { ...content, title: 'Uus nimetus' },
  }, owner.cookie));
  assert.equal((await successful(await request(publicPath))).title, content.title);
  const rejected = await successful(await request(reviewPath, {
   decision: 'reject', note: 'Palun täpsusta teenust.', version: changed.version,
  }, admin.cookie, origins[1]));
  assert.equal(rejected.status, 'rejected');
  const hidden = await successful(await request(ownerPath, { id, version: rejected.version, action: 'hide' }, owner.cookie));
  assert.equal((await request(publicPath)).status, 404);
  assert.equal((await request(photoPath)).status, 404);
  assert.equal((await successful(await request('/v1/services'))).items.length, 0);
  await successful(await request(ownerPath, { id, version: hidden.version, action: 'show' }, owner.cookie));
  assert.equal((await successful(await request(publicPath))).title, content.title);
 } finally {
  await client.close();
 }
});
