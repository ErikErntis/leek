import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as schema from '@leek/db/schema';
import type { ProductContent, ShopConnectionInput, StoreProduct } from '@leek/contracts';
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

test('Wix catalog version detection reads visible products and sends credentials only to Wix', async () => {
 const siteId = randomUUID();
 const productId = randomUUID();
 const apiKey = 'test-wix-secret-fixture';
 const calls: { url: URL; body?: string; headers?: Record<string, string> }[] = [];
 const modern = {
  id: productId, name: 'Puidust laud', visible: true, currency: 'EUR', plainDescription: '<p>Puidust laud.</p>',
  url: { url: 'https://vello.ee/tooted/laud' },
  media: { main: { image: { url: 'https://static.wixstatic.com/media/laud.jpg' } } },
  actualPriceRange: { minValue: { amount: '30' }, maxValue: { amount: '45' } },
  inventory: { availabilityStatus: 'OUT_OF_STOCK', preorderAvailability: 'SOME_VARIANTS' },
 };
 const legacy = {
  id: productId, name: 'Puidust laud', visible: true, description: '<p>Puidust laud.</p>',
  productPageUrl: { base: 'https://vello.wixsite.com/pood', path: '/product-page/laud' },
  media: { mainMedia: { image: { url: 'https://static.wixstatic.com/media/laud.jpg' } } },
  priceData: { currency: 'EUR', discountedPrice: 24 }, stock: { inventoryStatus: 'IN_STOCK' },
 };
 let version = 'V3_CATALOG';
 const catalog = createStoreCatalog(async (url, body, headers) => {
  calls.push({ url, body, headers });
  const product = version === 'V3_CATALOG' ? modern : legacy;
  const json = url.pathname.endsWith('/version') ? { catalogVersion: version } :
   url.pathname.endsWith('/query') ? { products: [product, { ...product, visible: false }], totalResults: 3, pagingMetadata: { cursors: { next: 'wix-next' } } } :
   { product: { ...product, visible: false } };
  return { json, status: 200, totalPages: 0 };
 });
 const shop = { platform: 'wix', url: 'https://vello.ee', wix: { siteId, apiKey } } as const;
 const v3 = await catalog.page(shop, null);
 assert.equal(v3.next, 'wix-next');
 assert.equal(v3.items.length, 1);
 assert.equal(v3.items[0]?.priceCents, 3000);
 assert.equal(v3.items[0]?.availability, 'on_order');
 assert.equal(v3.items[0]?.fromPrice, true);
 assert.equal(await catalog.get(shop, productId), null);
 version = 'V1_CATALOG';
 const v1 = await catalog.page(shop, '1');
 assert.equal(v1.items[0]?.priceCents, 2400);
 assert.equal(v1.items[0]?.url, 'https://vello.wixsite.com/pood/product-page/laud');
 assert.deepEqual(v1.items[0]?.photos, ['https://static.wixstatic.com/media/laud.jpg']);
 assert.equal(JSON.parse(calls[5]!.body!).query.paging.offset, 1);
 assert.ok(calls.every(call => call.url.origin === 'https://www.wixapis.com' && call.headers?.authorization === apiKey && call.headers['wix-site-id'] === siteId));
});

test('product API publishes manual and imported products directly, syncs shops and routes private help requests', async () => {
 const client = new PGlite();
 try {
  for (const file of ['0000_stormy_paibok.sql', '0001_flaky_nebula.sql', '0002_moaning_zarda.sql']) {
   await client.exec(await readFile(new URL(`../../../packages/db/migrations/${file}`, import.meta.url), 'utf8'));
  }
  await client.exec(`
   CREATE TABLE product_shops (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK(platform IN ('shopify','woocommerce')), url text NOT NULL
   )
  `);
  await client.exec(billingMigration);
  await client.exec(billingMigration);
  const db = drizzle(client, { schema }) as unknown as Parameters<typeof createAuth>[0];
  const origins = ['https://web.test', 'https://admin.test'];
  const auth = createAuth(db, { publicURL: origins[0]!, adminURL: origins[1]!, secret: 'local-tests-only-secret-long-enough-for-better-auth' });
  let storeItem: StoreProduct | null = {
   sourceId: '1', title: 'Tammest alus', description: 'Käsitsi valmistatud alus.', photos: ['https://vello.ee/alu.jpg'],
   url: 'https://vello.ee/alus', priceCents: 1800, fromPrice: false, availability: 'in_stock',
  };
  let wixKeyUsed: string | undefined;
  const products = createProductListings(db, {
   page: async (connection: ShopConnectionInput) => {
    if (connection.platform === 'wix') wixKeyUsed = connection.wix?.apiKey;
    return { items: storeItem ? [storeItem] : [], next: null };
   },
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
  const catalog = { action: 'catalog', connection: { platform: 'woocommerce', url: 'https://vello.ee' }, cursor: null };
  assert.equal((await request(ownerPath, catalog, outsider.cookie)).status, 404);
  assert.equal((await request(ownerPath, catalog, owner.cookie, 'https://foreign.test')).status, 403);
  const { shop } = await okay(await request(ownerPath, catalog, owner.cookie));
  process.env.LEEK_WIX_CREDENTIALS_KEY = Buffer.alloc(32, 19).toString('base64');
  const wix = { siteId: randomUUID(), apiKey: 'private-wix-key-fixture' };
  const wixCatalog = { ...catalog, connection: { platform: 'wix', url: 'https://vello.ee', wix } };
  const connected = await okay(await request(ownerPath, wixCatalog, owner.cookie));
  assert.equal(wixKeyUsed, wix.apiKey);
  const [stored] = await db.select().from(schema.productShops).where(eq(schema.productShops.id, connected.shop.id));
  assert.ok(stored?.wixApiKey);
  assert.notEqual(stored.wixApiKey, wix.apiKey);
  assert.doesNotMatch(JSON.stringify(connected), /private-wix-key-fixture|wixApiKey|wixSiteId/);
  assert.doesNotMatch(JSON.stringify(await okay(await request(ownerPath, undefined, owner.cookie))), /private-wix-key-fixture|wixApiKey|wixSiteId/);
  assert.equal((await request(ownerPath, { ...wixCatalog, connection: { ...wixCatalog.connection, wix: { ...wix, siteId: randomUUID() } } }, owner.cookie)).status, 409);
  wixKeyUsed = undefined;
  await okay(await request(ownerPath, { ...wixCatalog, connection: { platform: 'wix', url: 'https://vello.ee' } }, owner.cookie));
  assert.equal(wixKeyUsed, wix.apiKey);
  const importInput = { action: 'import', shopId: shop.id, cursor: null, sourceIds: ['1'], publish: true };
  await db.update(schema.companies).set({ status: 'pending' }).where(eq(schema.companies.id, companyId));
  assert.equal((await request(ownerPath, importInput, owner.cookie)).status, 409);
  await db.update(schema.companies).set({ status: 'published' }).where(eq(schema.companies.id, companyId));
  const imported = (await okay(await request(ownerPath, importInput, owner.cookie))).items[0];
  assert.equal(imported.status, 'approved');
  assert.equal((await okay(await request(ownerPath, importInput, owner.cookie))).items.length, 0);
  assert.equal((await request(adminPath, undefined, owner.cookie)).status, 403);
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
  const content: ProductContent = { title: 'Puidust lõikelaud', description: 'Tammest lõikelaud.', category: 'Kodu ja sisustus',
   photos: [`/api/media/${photo!.id}`], availability: 'in_stock', priceCents: 2900, shopUrl: '', variants: [] };
  const manual = await okay(await request(ownerPath, { action: 'draft', id, version: null, content }, owner.cookie));
  assert.equal((await request(photoPath)).status, 404);
  const published = await okay(await request(ownerPath, { action: 'publish', id, version: manual.version, content }, owner.cookie));
  assert.equal((await request(photoPath)).status, 302);
  assert.equal((await okay(await request('/v1/products?q=l%C3%B5ikelaud&company=vello'))).items[0].id, id);
  const updatedContent = { ...content, title: 'Uuendatud lõikelaud' };
  const savedDraft = await okay(await request(ownerPath, { action: 'draft', id, version: published.version, content: updatedContent }, owner.cookie));
  assert.equal((await okay(await request(`/v1/products/${id}`))).content.title, content.title);
  const updated = await okay(await request(ownerPath, { action: 'publish', id, version: savedDraft.version, content: updatedContent }, owner.cookie));
  assert.equal((await okay(await request(`/v1/products/${id}`))).content.title, updatedContent.title);
  await okay(await request(ownerPath, { action: 'hide', id, version: updated.version }, owner.cookie));
  assert.equal((await request(photoPath)).status, 404);

  const drafts = Array.from({ length: 50 }, (_, index) => ({
   id: randomUUID(), companyId, shopId: shop.id, sourceId: String(index + 10),
   content: { ...content, title: `Imporditud laud ${index + 1}`, description: '', photos: [] },
   status: index === 0 ? 'pending' as const : 'draft' as const,
  }));
  await db.insert(schema.productListings).values(drafts);
  const ids = drafts.map(item => item.id);
  assert.equal((await request(ownerPath, { action: 'publish-imported', ids }, outsider.cookie)).status, 404);
  const bulk = await okay(await request(ownerPath, { action: 'publish-imported', ids }, owner.cookie));
  assert.equal(bulk.items.length, 50);
  assert.equal((await okay(await request(ownerPath, { action: 'publish-imported', ids }, owner.cookie))).items.length, 0);
  assert.equal((await okay(await request(`/v1/products/${ids[0]}`))).content.title, drafts[0]!.content.title);
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
