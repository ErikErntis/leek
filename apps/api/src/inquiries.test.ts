import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as schema from '@leek/db/schema';
import type { InquirySummary, InquiryThread, ProductContent, ServiceContent } from '@leek/contracts';
import { createAuth } from '@leek/auth/server';
import { billingMigration } from '../../../packages/db/src/migrate-billing';
import { createApp } from './app';
import { createCompanyService } from './company-service';
import { createInquiries } from './inquiries';

test('inbox preserves product details and authorizes service decisions by participant', async () => {
 const client = new PGlite();
 try {
  for (const file of ['0000_stormy_paibok.sql', '0001_flaky_nebula.sql', '0002_moaning_zarda.sql']) {
   await client.exec(await readFile(new URL(`../../../packages/db/migrations/${file}`, import.meta.url), 'utf8'));
  }
  await client.exec(billingMigration);
  await client.exec(billingMigration);
  const db = drizzle(client, { schema }) as unknown as Parameters<typeof createAuth>[0];
  const origin = 'https://web.test';
  const auth = createAuth(db, { publicURL: origin, adminURL: 'https://admin.test', secret: 'local-tests-only-secret-long-enough-for-better-auth' });
  const app = createApp(
   { check: async () => {}, readPublic: async () => ({ companies: [], jobs: [], offers: [], source: 'database' }) },
   [origin], auth, createCompanyService(db), undefined, undefined, undefined, undefined, undefined, createInquiries(db),
  );
  const request = (path: string, cookie?: string, body?: unknown, from = origin) => app.request(`https://api.test${path}`, {
   method: body === undefined ? 'GET' : 'POST',
   headers: { Origin: from, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
   body: body === undefined ? undefined : JSON.stringify(body),
  });
  async function checked(response: Response, status: number) {
   assert.equal(response.status, status, await response.clone().text());
   return response.json();
  }
  async function signup(name: string) {
   const response = await request('/api/auth/sign-up/email', undefined, {
    name, email: `${name.toLowerCase()}@inquiries.test`, password: 'Test-password-42',
   });
   const { user } = await checked(response, 200);
   const cookie = response.headers.getSetCookie().find(value => value.startsWith('__Secure-leek.session_token='))!.split(';')[0]!;
   return { id: user.id as string, cookie };
  }
  const owner = await signup('Owner');
  const customer = await signup('Customer');
  const outsider = await signup('Outsider');
  const [company] = await db.insert(schema.companies).values({
   slug: 'inbox-test', name: 'Puit OÜ', registrationCode: '12345678', status: 'published',
   category: 'Tootmine', municipality: 'Lääne-Harju vald', email: 'tere@inquiries.test', website: '',
  }).returning({ id: schema.companies.id });
  const companyId = company!.id;
  await db.insert(schema.memberships).values({ companyId, userId: owner.id, role: 'owner' });

  const productId = randomUUID();
  const shopProductId = randomUUID();
  const variantId = randomUUID();
  const product: ProductContent = { title: 'Lõikelaud', category: 'Kodu ja sisustus', description: 'Puidust lõikelaud.',
   photos: [], priceCents: 1000, availability: 'in_stock', shopUrl: '',
   variants: [{ id: variantId, name: 'Suur', priceCents: 1800, availability: 'in_stock' }] };
  const shopProduct = { ...product, shopUrl: 'https://puit.test/laud' };
  await db.insert(schema.productListings).values([
   { id: productId, companyId, content: product, published: product, status: 'approved' },
   { id: shopProductId, companyId, content: shopProduct, published: shopProduct, status: 'approved' },
  ]);
  const fixedId = randomUUID();
  const quoteId = randomUUID();
  const packageId = randomUUID();
  const quote: ServiceContent = { title: 'Paigaldus', category: 'Mööbel ja sisustus', area: 'Lääne-Harju vald',
   description: 'Paigaldame mööblit.', pricing: 'quote', priceCents: null, photo: '' };
  const fixed: ServiceContent = { ...quote, pricing: 'fixed', packages: [{ id: packageId, title: 'Väike töö', description: 'Üks kapp.', priceCents: 4000 }] };
  await db.insert(schema.serviceListings).values([
   { id: fixedId, companyId, content: fixed, published: fixed, status: 'approved' },
   { id: quoteId, companyId, content: quote, published: quote, status: 'approved' },
  ]);

  const base = '/v1/my/inquiries';
  const companyScope = `?company=${companyId}`;
  const customerRequest = { source: 'product', id: randomUUID(), listingId: productId, optionId: variantId, quantity: 3, message: 'Kas kolm on saadaval?' };
  const productThread = `${base}/${customerRequest.id}`;
  assert.equal((await request(base)).status, 401);
  assert.equal((await request(base, customer.cookie, customerRequest, 'https://foreign.test')).status, 403);
  assert.equal((await request(base, customer.cookie, { ...customerRequest, listingId: shopProductId })).status, 404);
  assert.equal((await request(base, customer.cookie, { ...customerRequest, optionId: null })).status, 409);
  assert.deepEqual(await checked(await request(base, customer.cookie, customerRequest), 201), { id: customerRequest.id });
  await checked(await request(base, customer.cookie, customerRequest), 201);
  assert.equal((await request(productThread, outsider.cookie)).status, 404);
  assert.equal((await request(productThread + companyScope, customer.cookie)).status, 404);
  assert.equal((await request(productThread, owner.cookie)).status, 404);
  await db.delete(schema.productListings).where(eq(schema.productListings.id, productId));
  const reply = { action: 'reply', id: randomUUID(), message: 'Jah, kolm on saadaval.' };
  await checked(await request(productThread + companyScope, owner.cookie, reply), 200);
  await checked(await request(productThread + companyScope, owner.cookie, reply), 200);
  const productResult: InquiryThread = await checked(await request(productThread, customer.cookie), 200);
  assert.deepEqual(productResult.snapshot, { listingId: productId, title: 'Lõikelaud', optionTitle: 'Suur', priceCents: 1800, quantity: 3 });
  assert.deepEqual(productResult.messages.map(({ side, body }) => [side, body]), [
   ['customer', customerRequest.message], ['company', reply.message],
  ]);

  const order = { source: 'service', id: randomUUID(), listingId: fixedId, optionId: packageId,
   expectedPriceCents: 4000, location: 'Paldiski', desiredDate: '2026-12-01', message: 'Palun paigaldage kapp.' };
  const orderPath = `${base}/${order.id}`;
  assert.equal((await request(base, customer.cookie, { ...order, expectedPriceCents: 3999 })).status, 409);
  await checked(await request(base, customer.cookie, order), 201);
  const accept = { action: 'decide', decision: 'accept', offerId: null };
  assert.equal((await request(orderPath, customer.cookie, accept)).status, 404);
  await checked(await request(orderPath + companyScope, owner.cookie, accept), 200);
  const orderResult: InquiryThread = await checked(await request(orderPath, customer.cookie), 200);
  assert.equal(orderResult.status, 'accepted');
  assert.equal(orderResult.snapshot.optionTitle, 'Väike töö');
  assert.equal(orderResult.desiredDate, '2026-12-01');

  const quoteRequest = { ...order, id: randomUUID(), listingId: quoteId, optionId: null, expectedPriceCents: null };
  const quotePath = `${base}/${quoteRequest.id}`;
  await checked(await request(base, customer.cookie, quoteRequest), 201);
  const offer = { action: 'offer', id: randomUUID(), priceCents: 6500, proposedDate: '2026-12-02', message: 'Koos paigaldusega.' };
  assert.equal((await request(quotePath, customer.cookie, offer)).status, 404);
  await checked(await request(quotePath + companyScope, owner.cookie, offer), 200);
  const replacement = { ...offer, id: randomUUID(), priceCents: 6000 };
  await checked(await request(quotePath + companyScope, owner.cookie, replacement), 200);
  assert.equal((await request(quotePath, customer.cookie, { ...accept, offerId: offer.id })).status, 409);
  await checked(await request(quotePath, customer.cookie, { ...accept, offerId: replacement.id }), 200);
  const quoteResult: InquiryThread = await checked(await request(quotePath + companyScope, owner.cookie), 200);
  assert.equal(quoteResult.status, 'accepted');
  assert.deepEqual(quoteResult.offers.map(item => item.status), ['accepted', 'replaced']);

  const { items }: { items: InquirySummary[] } = await checked(await request(base + companyScope, owner.cookie), 200);
  assert.deepEqual(new Set(items.map(item => item.kind)), new Set(['product', 'fixed_service', 'service_quote']));
  assert.deepEqual((await checked(await request(base + companyScope, outsider.cookie), 200)).items, []);
 } finally {
  await client.close();
 }
});
