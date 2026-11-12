import { Resolver } from 'node:dns/promises';
import { request } from 'node:https';
import { BlockList } from 'node:net';
import { publicHttpsUrl, type ShopConnectionInput, type StoreProduct, type StoreProductPage } from '@leek/contracts';
import { CompanyError } from './company-service';

const unavailable = 'E-poe kataloogi ei saanud laadida. Kontrolli aadressi ja poe avalikku ligipääsu.';
const timeout = 6500;
const pageSize = 20;
const blocked = new BlockList();
for (const [subnet, prefix] of [
 ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
 ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16],
 ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(subnet, prefix);

export function normalizeShop(input: ShopConnectionInput): ShopConnectionInput {
 const raw = input.url.includes('://') ? input.url : `https://${input.url}`;
 const safe = publicHttpsUrl(raw);
 if (!safe) throw new CompanyError(400, 'Sisesta avaliku HTTPS e-poe aadress.');
 const url = new URL(safe);
 if (url.search || url.hash || !/^\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]*$/i.test(url.pathname)) {
  throw new CompanyError(400, 'Sisesta poe avalehe aadress.');
 }
 if (input.platform === 'shopify' && (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(url.hostname) || url.pathname !== '/')) {
  throw new CompanyError(400, 'Sisesta Shopify poe myshopify.com aadress.');
 }
 return { platform: input.platform, url: url.origin + url.pathname.replace(/\/$/, '') };
}

let activeRequests = 0;
async function readJson(url: URL, body?: string) {
 if (activeRequests >= 12) throw new CompanyError(429, 'Poe ühendamine on hetkel hõivatud. Proovi uuesti.');
 activeRequests++;
 try {
  const resolver = new Resolver({ timeout: 1500, tries: 1 });
  const addresses = await resolver.resolve4(url.hostname);
  if (!addresses[0] || addresses.some(ip => blocked.check(ip))) throw new Error('Destination is not publicly routable');
  const address = addresses[0];
  return await new Promise<{ status: number; json: unknown; totalPages: number }>((resolve, reject) => {
   const req = request(url, {
    method: body ? 'POST' : 'GET', agent: false, family: 4,
    signal: AbortSignal.timeout(timeout),
    lookup: (_hostname, _options, callback) => callback(null, address, 4),
    headers: { accept: 'application/json', 'user-agent': 'LEEK product catalog', ...(body ? { 'content-type': 'application/json' } : {}) },
   }, response => {
    const status = response.statusCode ?? 500;
    if (status === 404 || status === 410) {
     response.destroy();
     resolve({ status, json: null, totalPages: 0 });
     return;
    }
    if (status < 200 || status >= 300 || !response.headers['content-type']?.includes('json')) {
     response.destroy();
     reject(new Error('Invalid store response'));
     return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    response.on('error', reject);
    response.on('aborted', () => reject(new Error('Incomplete store response')));
    response.on('data', (chunk: Buffer) => {
     size += chunk.length;
     if (size > 1_500_000) req.destroy(new Error('Store response too large'));
     else chunks.push(chunk);
    });
    response.on('end', () => {
     try {
      resolve({ status, json: JSON.parse(Buffer.concat(chunks).toString('utf8')), totalPages: Number(response.headers['x-wp-totalpages'] ?? 0) });
     } catch (error) {
      reject(error);
     }
    });
   });
   req.on('error', reject);
   req.end(body);
  });
 } catch {
  throw new CompanyError(400, unavailable);
 } finally {
  activeRequests--;
 }
}

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const string = (value: unknown) => typeof value === 'string' ? value : '';
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
function text(value: unknown, max: number) {
 return string(value).replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#8211);/g, entity => ({
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ', '&#39;': "'", '&#8211;': '–',
 }[entity] ?? entity)).replace(/\s+/g, ' ').trim().slice(0, max);
}
function euros(value: unknown, currency: unknown, minorUnit: number) {
 if (currency !== 'EUR' || !/^\d+(?:\.\d+)?$/.test(string(value))) return null;
 const cents = Math.round(Number(value) * 10 ** (2 - minorUnit));
 return Number.isSafeInteger(cents) && cents >= 0 && cents <= 100_000_000 ? cents : null;
}
function photos(items: unknown[], key: string) {
 return [...new Set(items.map(item => publicHttpsUrl(string(record(item)[key]))).filter(Boolean))].slice(0, 5);
}

const shopifyFields = 'id title description availableForSale onlineStoreUrl priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } } images(first: 5) { nodes { url } }';
function shopifyProduct(value: unknown): StoreProduct | null {
 const item = record(value);
 const sourceId = string(item.id);
 const url = publicHttpsUrl(string(item.onlineStoreUrl));
 const title = text(item.title, 120);
 if (!/^gid:\/\/shopify\/Product\/\d+$/.test(sourceId) || !url || !title || typeof item.availableForSale !== 'boolean') return null;
 const range = record(item.priceRange);
 const minimum = record(range.minVariantPrice);
 const maximum = record(range.maxVariantPrice);
 const priceCents = euros(minimum.amount, minimum.currencyCode, 0);
 const max = euros(maximum.amount, maximum.currencyCode, 0);
 return { sourceId, title, url, description: text(item.description, 2000), photos: photos(list(record(item.images).nodes), 'url'),
  priceCents, fromPrice: priceCents !== null && max !== null && max > priceCents,
  availability: item.availableForSale ? 'in_stock' : 'sold_out' };
}

function wooProduct(value: unknown): StoreProduct | null {
 const item = record(value);
 const url = publicHttpsUrl(string(item.permalink));
 const title = text(item.name, 120);
 if (typeof item.id !== 'number' || !Number.isSafeInteger(item.id) || item.id < 1 || !url || !title || typeof item.is_in_stock !== 'boolean' || item.is_password_protected === true) return null;
 const prices = record(item.prices);
 const range = record(prices.price_range);
 const minorUnit = prices.currency_minor_unit === 2 ? 2 : -1;
 const priceCents = minorUnit < 0 ? null : euros(range.min_amount ?? prices.price, prices.currency_code, minorUnit);
 const maximum = minorUnit < 0 ? null : euros(range.max_amount, prices.currency_code, minorUnit);
 return { sourceId: String(item.id), title, url, description: text(item.short_description || item.description, 2000), photos: photos(list(item.images), 'src'),
  priceCents, fromPrice: priceCents !== null && maximum !== null && maximum > priceCents,
  availability: item.is_on_backorder === true ? 'on_order' : item.is_in_stock ? 'in_stock' : 'sold_out' };
}

async function graphql(read: typeof readJson, shop: ShopConnectionInput, query: string, variables: object) {
 const endpoint = new URL('/api/2026-10/graphql.json', shop.url);
 const result = record((await read(endpoint, JSON.stringify({ query, variables }))).json);
 if (!result.data || list(result.errors).length) throw new CompanyError(400, unavailable);
 return record(result.data);
}

function wooEndpoint(shop: ShopConnectionInput) {
 return new URL(`${shop.url}/wp-json/wc/store/v1/products`);
}

export function createStoreCatalog(read = readJson) {
 return {
 async page(shop: ShopConnectionInput, cursor: string | null): Promise<StoreProductPage> {
  if (shop.platform === 'shopify') {
   const data = await graphql(read, shop, `query($cursor: String) @inContext(country: EE) { products(first: ${pageSize}, after: $cursor) { nodes { ${shopifyFields} } pageInfo { hasNextPage endCursor } } }`, { cursor });
   const collection = record(data.products);
   if (!Array.isArray(collection.nodes)) throw new CompanyError(400, unavailable);
   const pageInfo = record(collection.pageInfo);
   return { items: collection.nodes.map(shopifyProduct).filter(item => item !== null), next: pageInfo.hasNextPage ? string(pageInfo.endCursor) || null : null };
  }
  if (cursor !== null && !/^[1-9][0-9]{0,4}$/.test(cursor)) throw new CompanyError(400, 'Vigane kataloogileht.');
  const page = Number(cursor ?? 1);
  const endpoint = wooEndpoint(shop);
  endpoint.search = new URLSearchParams({ page: String(page), per_page: String(pageSize), catalog_visibility: 'visible', return_price_range: 'true' }).toString();
  const { json, totalPages } = await read(endpoint);
  if (!Array.isArray(json)) throw new CompanyError(400, unavailable);
  return { items: json.map(wooProduct).filter(item => item !== null), next: (totalPages ? page < totalPages : json.length === pageSize) && page < 99999 ? String(page + 1) : null };
 },
 async get(shop: ShopConnectionInput, sourceId: string): Promise<StoreProduct | null> {
  if (shop.platform === 'shopify') {
   const data = await graphql(read, shop, `query($id: ID!) @inContext(country: EE) { product(id: $id) { ${shopifyFields} } }`, { id: sourceId });
   return shopifyProduct(data.product);
  }
  if (!/^[1-9][0-9]*$/.test(sourceId)) return null;
  const endpoint = wooEndpoint(shop);
  endpoint.search = new URLSearchParams({ 'include[]': sourceId, catalog_visibility: 'visible', return_price_range: 'true' }).toString();
  const { json } = await read(endpoint);
  if (!Array.isArray(json)) throw new CompanyError(400, unavailable);
  return json.map(wooProduct).find(item => item?.sourceId === sourceId) ?? null;
 },
 };
}

export const storeCatalog = createStoreCatalog();
