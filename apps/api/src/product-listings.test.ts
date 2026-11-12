import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as schema from '@leek/db/schema';
import type { StoreProduct } from '@leek/contracts';
import { createAuth } from '@leek/auth/server';
import { billingMigration } from '../../../packages/db/src/migrate-billing';
import { createApp } from './app';
import { createCompanyService } from './company-service';
import { createMediaRoutes } from './media';
import { createProductListings } from './product-listings';
import { createStoreCatalog, normalizeShop } from './store-catalog';

test('shop addresses restrict protocols, Shopify hosts, ports and IP literals', () => {
 assert.equal(normalizeShop({ platform: 'shopify', url: 'vello.myshopify.com' }).url, 'https://vello.myshopify.com');
 assert.equal(normalizeShop({ platform: 'woocommerce', url: 'https://vello.ee/pood/' }).url, 'https://vello.ee/pood');
 for (const url of ['https://127.0.0.1', 'https://[::1]', 'https://2130706433', 'https://example.com:8080',
  'http://vello.ee', 'https://vello.ee/?q=1', 'https://user@vello.ee', 'https://myshop.lan']) {
  assert.throws(() => normalizeShop({ platform: 'woocommerce', url }));
 }
 assert.throws(() => normalizeShop({ platform: 'shopify', url: 'https://vello.myshopify.com.example.org' }));
});

test('store adapters read public catalogs, prices and publication state', async () => {
 const calls: { url: URL; body?: string }[] = [];
 const shopify = {
  id: 'gid://shopify/Product/1', title: 'Alus', description: 'Kirjeldus', availableForSale: true,
  onlineStoreUrl: 'https://vello.ee/products/alus',
  priceRange: { minVariantPrice: { amount: '18.00', currencyCode: 'EUR' }, maxVariantPrice: { amount: '20.00', currencyCode: 'EUR' } },
  images: { nodes: [{ url: 'https://cdn.shopify.com/alus.jpg' }] },
 };
 const woo = {
  id: 1, name: 'Alus', short_description: '<p>Vask &amp; puit</p>', permalink: 'https://vello.ee/alus',
  is_in_stock: false, is_on_backorder: true,
  prices: { price: '1100', currency_code: 'EUR', currency_minor_unit: 2, price_range: { min_amount: '900', max_amount: '1400' } },
  images: [{ src: 'https://vello.ee/alus.jpg' }],
 };
 const catalog = createStoreCatalog(async (url, body) => {
  calls.push({ url, body });
  return { status: 200, totalPages: 2, json: body ? {
   data: JSON.parse(body).variables.id
    ? { product: { ...shopify, onlineStoreUrl: null } }
    : { products: { nodes: [shopify], pageInfo: { hasNextPage: true, endCursor: 'next' } } },
  } : [woo] };
 });
 const shopifyConnection = { platform: 'shopify', url: 'https://vello.myshopify.com' } as const;
 const wooConnection = { platform: 'woocommerce', url: 'https://vello.ee/pood' } as const;
 const shopifyPage = await catalog.page(shopifyConnection, null);
 assert.equal(shopifyPage.next, 'next');
 assert.equal(shopifyPage.items[0]?.priceCents, 1800);
 assert.equal(shopifyPage.items[0]?.fromPrice, true);
 assert.equal(calls[0]?.url.pathname, '/api/2026-10/graphql.json');
 assert.equal(await catalog.get(shopifyConnection, shopify.id), null);
 const wooPage = await catalog.page(wooConnection, null);
 assert.equal(wooPage.next, '2');
 assert.equal(wooPage.items[0]?.description, 'Vask & puit');
 assert.equal(wooPage.items[0]?.availability, 'on_order');
 assert.equal(wooPage.items[0]?.priceCents, 900);
 assert.equal(calls[2]?.url.pathname, '/pood/wp-json/wc/store/v1/products');
 assert.equal((await catalog.get(wooConnection, '1'))?.priceCents, 900);
 assert.equal(calls[3]?.url.searchParams.get('include[]'), '1');
});

test('product API moderates manual and imported products, syncs shops and routes private help requests', async () => {
 const client = new PGlite();
 try {
  for (const file of ['0000_stormy_paibok.sql', '0001_flaky_nebula.sql', '0002_moaning_zarda.sql']) {
   await client.exec(await readFile(new URL(`../../../packages/db/migrations/${file}`, import.meta.url), 'utf8'));
  }
  await client.exec(billingMigration);
  await client.exec(billingMigration);
  const db = drizzle(client, { schema }) as unknown as Parameters<typeof createAuth>[0];
  const origins = ['https://web.test', 'https://admin.test'];
  const auth = createAuth(db, { publicURL: origins[0]!, adminURL: origins[1]!, secret: 'local-tests-only-secret-long-enough-for-better-auth' });
  let storeItem: StoreProduct | null = {
   sourceId: '1', title: 'Tammest alus', description: 'Käsitsi valmistatud alus.', photos: ['https://vello.ee/alu.jpg'],
   url: 'https://vello.ee/alus', priceCents: 1800, fromPrice: false, availability: 'in_stock',
  };
  const products = createProductListings(db, {
   page: async () => ({ items: storeItem ? [storeItem] : [], next: null }),
   get: async () => storeItem,
  });
  Object.assign(process.env, { AWS_ENDPOINT_URL: 'https://bucket.test', AWS_S3_BUCKET_NAME: 'test', AWS_ACCESS_KEY_ID: 'test', AWS_SECRET_ACCESS_KEY: 'test-secret' });
  const app = createApp({ check: async () => {}, readPublic: async () => ({ companies: [], jobs: [], offers: [], source: 'database' }) },
   origins, auth, createCompanyService(db), undefined, undefined, createMediaRoutes(db, auth, origins), undefined, products);
  const request = (path: string, body?: unknown, cookie?: string, origin = origins[0]!) => app.request(`https://api.test${path}`, {
   method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
   body: body === undefined ? undefined : JSON.stringify(body),
  });
  async function okay(response: Response) {
   assert.equal(response.status, 200, await response.clone().text());
   return response.json();
  }
  async function signup(email: string) {
   const response = await request('/api/auth/sign-up/email', { name: 'Test Kasutaja', email, password: 'Test-password-42' });
   const { user } = await okay(response);
   return { id: user.id as string, cookie: response.headers.getSetCookie().find(value => value.startsWith('__Secure-leek.session_token='))!.split(';')[0]! };
  }
  const owner = await signup('owner@products.test');
  const outsider = await signup('outsider@products.test');
  const admin = await signup('admin@products.test');
  await db.update(schema.users).set({ role: 'admin' }).where(eq(schema.users.id, admin.id));
  const [company] = await db.insert(schema.companies).values({
   slug: 'vello', name: 'Vello Puit OÜ', registrationCode: '12345678', status: 'published',
   category: 'Tootmine', municipality: 'Lääne-Harju vald', email: 'tere@products.test', website: '',
  }).returning();
  const companyId = company!.id;
  await db.insert(schema.memberships).values({ companyId, userId: owner.id, role: 'owner' });
  const [photo] = await db.insert(schema.companyMedia).values({ companyId, kind: 'image', key: 'photo.webp' }).returning();
  const photoPath = `/v1/media/${photo!.id}`;
  const ownerPath = `/v1/my/companies/${companyId}/products`;
  const adminPath = '/v1/admin/products';
  const approve = (id: string, version: number) => request(`${adminPath}/${id}/review`, { decision: 'approve', version }, admin.cookie, origins[1]);
  const catalog = { action: 'catalog', connection: { platform: 'woocommerce', url: 'https://vello.ee' }, cursor: null };
  assert.equal((await request(ownerPath, catalog, outsider.cookie)).status, 404);
  assert.equal((await request(ownerPath, catalog, owner.cookie, 'https://foreign.test')).status, 403);
  const { shop } = await okay(await request(ownerPath, catalog, owner.cookie));
  const importInput = { action: 'import', shopId: shop.id, cursor: null, sourceIds: ['1'] };
  const imported = (await okay(await request(ownerPath, importInput, owner.cookie))).items[0];
  assert.equal((await okay(await request(ownerPath, importInput, owner.cookie))).items.length, 0);
  assert.equal((await request(`/v1/products/${imported.id}`)).status, 404);
  const submitted = await okay(await request(ownerPath, { action: 'submit', id: imported.id, version: imported.version, content: imported.content }, owner.cookie));
  assert.equal((await request(adminPath, undefined, owner.cookie)).status, 403);
  await okay(await approve(imported.id, submitted.version));
  const publicPath = `/v1/products/${imported.id}`;
  assert.equal((await okay(await request(publicPath))).content.priceCents, 1800);
  storeItem = { ...storeItem, priceCents: 2250, availability: 'sold_out' };
  await products.sync();
  const synced = await okay(await request(publicPath));
  assert.equal(synced.content.priceCents, 2250);
  assert.equal(synced.availability, 'sold_out');
  await db.update(schema.productListings).set({ syncedAt: new Date(0), attemptedAt: null }).where(eq(schema.productListings.id, imported.id));
  const stale = await okay(await request(publicPath));
  assert.equal(stale.content.priceCents, null);
  assert.equal(stale.availability, null);
  storeItem = null;
  await products.sync();
  assert.equal((await okay(await request(publicPath))).content.shopUrl, '');

  const id = randomUUID();
  const content = { title: 'Puidust lõikelaud', description: 'Tammest lõikelaud.', category: 'Kodu ja sisustus',
   photos: [`/api/media/${photo!.id}`], availability: 'in_stock', priceCents: 2900, shopUrl: '', variants: [] };
  const manual = await okay(await request(ownerPath, { action: 'submit', id, version: null, content }, owner.cookie));
  assert.equal((await request(photoPath)).status, 404);
  const approved = await okay(await approve(id, manual.version));
  assert.equal((await request(photoPath)).status, 302);
  assert.equal((await okay(await request('/v1/products?q=l%C3%B5ikelaud&company=vello'))).items[0].id, id);
  await okay(await request(ownerPath, { action: 'hide', id, version: approved.version }, owner.cookie));
  assert.equal((await request(photoPath)).status, 404);
  const helpId = randomUUID();
  const help = { action: 'help', id: helpId, shopUrl: 'https://vello.ee', email: 'kontakt@products.test', message: 'Vajan poe seadistamisel abi.' };
  await okay(await request(ownerPath, help, owner.cookie));
  await okay(await request(ownerPath, help, owner.cookie));
  const queue = await okay(await request(adminPath, undefined, admin.cookie, origins[1]));
  assert.equal(queue.requests.length, 1);
  assert.equal(queue.requests[0].email, help.email);
  await okay(await request(`/v1/admin/product-help/${helpId}/resolve`, {}, admin.cookie, origins[1]));
  assert.equal((await okay(await request(adminPath, undefined, admin.cookie, origins[1]))).requests.length, 0);
 } finally {
  await client.close();
 }
});
