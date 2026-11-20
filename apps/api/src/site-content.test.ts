import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import sharp from 'sharp';
import { defaultSiteContent } from '@leek/contracts';
import * as schema from '@leek/db/schema';
import { billingMigration } from '../../../packages/db/src/migrate-billing';
import { createApp, type AuthHandler } from './app';
import { createCompanyService } from './company-service';
import { createSiteContent } from './site-content';
import { createMediaRoutes } from './media';

test('site editor authorizes admins, publishes atomically, detects conflicting edits and protects unpublished uploads', async () => {
 const client = new PGlite();
 const objects: Buffer[] = [];
 const storage = createServer(async (request, response) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk);
  objects.push(Buffer.concat(chunks));
  response.writeHead(200, { ETag: '"test"' }).end();
 });
 storage.listen(0, '127.0.0.1');
 await once(storage, 'listening');
 Object.assign(process.env, {
  AWS_ENDPOINT_URL: `http://127.0.0.1:${(storage.address() as { port: number }).port}`,
  AWS_S3_BUCKET_NAME: 'test', AWS_ACCESS_KEY_ID: 'test', AWS_SECRET_ACCESS_KEY: 'test-secret',
  BUCKET_FORCE_PATH_STYLE: 'true', AWS_DEFAULT_REGION: 'auto',
 });
 try {
  for (const migration of ['0000_stormy_paibok.sql', '0001_flaky_nebula.sql', '0002_moaning_zarda.sql', '0003_product_categories.sql', '0004_site_content.sql']) {
   await client.exec(await readFile(new URL(`../../../packages/db/migrations/${migration}`, import.meta.url), 'utf8'));
  }
  await client.exec(billingMigration);
  await client.exec(billingMigration);
  const db = drizzle(client, { schema }) as unknown as Parameters<typeof createSiteContent>[0];
  const [admin, member] = await db.insert(schema.users).values([
   { name: 'Admin', email: 'admin@site.test', role: 'admin' },
   { name: 'Member', email: 'member@site.test', role: 'member' },
  ]).returning();
  const auth = {
   api: { getSession: async ({ headers }: { headers: Headers }) => {
    const user = headers.get('cookie') === 'admin' ? admin : headers.get('cookie') === 'member' ? member : undefined;
    return user ? { user } : null;
   } },
  } as unknown as AuthHandler;
  const origins = ['https://admin.test'];
  const site = createSiteContent(db);
  const app = createApp(
   { check: async () => {}, readPublic: async () => ({ companies: [], jobs: [], offers: [], source: 'database' }) },
   origins, auth, createCompanyService(db), undefined, undefined, createMediaRoutes(db, auth, origins),
   undefined, undefined, undefined, site,
  );
  const path = '/v1/admin/site-content';
  const request = (body?: unknown, cookie = 'admin', origin = origins[0]) => app.request(path, {
   method: body ? 'POST' : 'GET',
   headers: { cookie, origin: origin!, 'content-type': 'application/json' },
   body: body ? JSON.stringify(body) : undefined,
  });
  assert.equal((await request(undefined, '')).status, 401);
  assert.equal((await request(undefined, 'member')).status, 403);
  const defaults = await (await request()).json();
  assert.equal(defaults.version, 0);
  assert.deepEqual(defaults.content, defaultSiteContent);
  const content = { ...defaults.content, heroTitle: 'Muudetud pealkiri', bannerVisible: false };
  const update = { version: 0, content };
  assert.equal((await request(update, 'member')).status, 403);
  assert.equal((await request(update, 'admin', 'https://foreign.test')).status, 403);
  for (const invalid of [
   { ...content, bannerLink: 'javascript:alert(1)' },
   { ...content, heroImage: '/api/media/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
   { ...content, heroTitle: '' },
  ]) assert.equal((await request({ version: 0, content: invalid })).status, 400);
  const responses = await Promise.all([request(update), request(update)]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  const publicPage = await (await app.request('/v1/site-content')).json();
  assert.equal(publicPage.version, 1);
  assert.equal(publicPage.content.heroTitle, content.heroTitle);
  assert.equal(publicPage.content.bannerVisible, false);

  const png = await sharp({ create: { width: 120, height: 90, channels: 3, background: 'white' } }).png().toBuffer();
  const upload = (cookie: string, bytes = png) => app.request('/v1/admin/site-images', {
   method: 'POST', headers: { cookie, origin: origins[0]!, 'content-type': 'image/png' }, body: bytes,
  });
  assert.equal((await upload('')).status, 401);
  assert.equal((await upload('member')).status, 403);
  assert.equal((await upload('admin', Buffer.from('invalid'))).status, 400);
  const uploaded = await upload('admin');
  assert.equal(uploaded.status, 201, await uploaded.clone().text());
  const { url } = await uploaded.json();
  assert.equal((await sharp(objects[0]).metadata()).format, 'webp');
  const mediaPath = url.replace('/api/', '/v1/');
  assert.equal((await app.request(mediaPath)).status, 404);
  assert.equal((await app.request(mediaPath, { headers: { cookie: 'member' } })).status, 404);
  assert.equal((await app.request(mediaPath, { headers: { cookie: 'admin' } })).status, 302);
  const withImage = { ...content, heroImage: url };
  assert.equal((await request({ version: 1, content: withImage })).status, 200);
  assert.equal((await app.request(mediaPath)).status, 302);
  assert.equal((await request({ version: 2, content })).status, 200);
  assert.equal((await app.request(mediaPath)).status, 404);
  assert.equal((await request({ version: 3, content: { ...content, heroImage: '/api/site-media/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' } })).status, 400);
  assert.equal((await site.read()).version, 3);
 } finally { storage.close(); await client.close(); }
});
