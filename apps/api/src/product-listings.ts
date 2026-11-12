import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { localProductPhoto, productCategories, type CompanyProduct, type ProductHelpInput, type ProductSave, type PublicProduct, type ShopConnectionInput, type StoreProduct, type SyncedProduct } from '@leek/contracts';
import { companies, companyMedia, memberships, productHelpRequests, productListings, productShops, type createDatabase } from '@leek/db';
import { CompanyError } from './company-service';
import { normalizeShop, storeCatalog } from './store-catalog';
import { decryptWixKey, encryptWixKey } from './wix-credentials';

type Database = ReturnType<typeof createDatabase>['db'];
type ProductRow = typeof productListings.$inferSelect;
const priceFreshness = 60 * 60 * 1000;
const syncInterval = 15 * 60 * 1000;

function companyProduct(row: ProductRow): CompanyProduct {
 const { id, version, content, published, status, note, visible, shopId, sourceId } = row;
 return { id, version, content, published, status, note, visible, shopId, sourceId };
}
function catalogConnection(shop: typeof productShops.$inferSelect): ShopConnectionInput {
 const { platform, url, wixSiteId, wixApiKey } = shop;
 if (platform !== 'wix') return { platform, url };
 if (!wixSiteId || !wixApiKey) throw new CompanyError(400, 'Lisa Wixi saidi ID ja API võti.');
 return { platform, url, wix: { siteId: wixSiteId, apiKey: decryptWixKey(wixApiKey, { companyId: shop.companyId, url, wixSiteId }) } };
}
function syncedData(item: StoreProduct): SyncedProduct {
 return { url: item.url, priceCents: item.priceCents, availability: item.availability, fromPrice: item.fromPrice };
}
function conflict(): never {
 throw new CompanyError(409, 'Toodet on vahepeal muudetud. Värskenda lehte.');
}

export function createProductListings(db: Database, catalog = storeCatalog) {
 async function ownerCompany(userId: string, companyId: string) {
  const [company] = await db.select({ status: companies.status }).from(companies)
   .innerJoin(memberships, eq(memberships.companyId, companies.id))
   .where(and(eq(companies.id, companyId), eq(memberships.userId, userId), eq(memberships.role, 'owner')));
  if (!company) throw new CompanyError(404, 'Ettevõtet ei leitud.');
  return company;
 }

 const publicRows = () => db.select({
  item: productListings,
  company: { name: companies.name, brandName: companies.brandName, slug: companies.slug, email: companies.email },
 }).from(productListings).innerJoin(companies, eq(companies.id, productListings.companyId));

 function toPublic({ item, company }: Awaited<ReturnType<typeof publicRows>>[number]): PublicProduct {
  const content = item.published!;
  if (!item.shopId) return { id: item.id, content, linked: false, fromPrice: false, availability: content.availability, company };
  const fresh = item.syncedAt !== null && Date.now() - item.syncedAt.getTime() < priceFreshness;
  return {
   id: item.id, linked: true, fromPrice: fresh && Boolean(item.storeData?.fromPrice),
   availability: fresh ? item.storeData?.availability ?? (item.syncedAt ? 'sold_out' : null) : null,
   content: { ...content, priceCents: fresh ? item.storeData?.priceCents ?? null : null, shopUrl: item.storeData?.url ?? '' },
   company,
  };
 }

 return {
  async own(userId: string, companyId: string) {
   await ownerCompany(userId, companyId);
   const [items, shops] = await Promise.all([
    db.select().from(productListings).where(eq(productListings.companyId, companyId)).orderBy(desc(productListings.updatedAt)),
    db.select({ id: productShops.id, platform: productShops.platform, url: productShops.url }).from(productShops).where(eq(productShops.companyId, companyId)).orderBy(productShops.url),
   ]);
   return { items: items.map(companyProduct), shops };
  },

  async save(userId: string, companyId: string, input: ProductSave) {
   const company = await ownerCompany(userId, companyId);
   const { id, version, action, content } = input;
   const match = and(eq(productListings.id, id), eq(productListings.companyId, companyId));
   const [current] = await db.select().from(productListings).where(match);
   if ((current?.version ?? null) !== version) conflict();

   if (action === 'hide' || action === 'show') {
    if (!current?.published) throw new CompanyError(409, 'Toode tuleb enne kinnitada.');
    const [saved] = await db.update(productListings).set({
     visible: action === 'show', version: current.version + 1, updatedAt: new Date(),
    }).where(and(match, eq(productListings.version, current.version))).returning();
    return companyProduct(saved ?? conflict());
   }

   if (current?.status === 'pending') throw new CompanyError(409, 'Toode ootab halduri otsust.');
   if (!content) throw new CompanyError(400, 'Lisa toote andmed.');
   if (current?.shopId && (content.priceCents !== current.content.priceCents || content.shopUrl !== current.content.shopUrl ||
    content.availability !== current.content.availability || content.variants.length)) {
    throw new CompanyError(400, 'Lingitud toote hinna ja saadavuse saad muuta e-poes.');
   }
   if (action === 'submit') {
    if (company.status !== 'published') throw new CompanyError(409, 'Toote saab esitada pärast ettevõtte kinnitamist.');
    if (content.title.length < 2 || content.description.length < 5) throw new CompanyError(400, 'Lisa toote nimi ja kirjeldus.');
    if (content.variants.some(item => !item.name || item.priceCents === null)) {
     throw new CompanyError(400, 'Lisa iga variandi nimi ja hind.');
    }
   }

   const local = [...new Set(content.photos.filter(photo => localProductPhoto.test(photo)).map(photo => photo.slice('/api/media/'.length)))];
   const remote = content.photos.filter(photo => !localProductPhoto.test(photo));
   if (remote.some(photo => !current?.shopId || !current.content.photos.includes(photo))) {
    throw new CompanyError(400, 'Kasuta üleslaaditud või e-poest imporditud pilte.');
   }
   if (local.length) {
    const photos = await db.select({ id: companyMedia.id }).from(companyMedia)
     .where(and(eq(companyMedia.companyId, companyId), eq(companyMedia.kind, 'image'), inArray(companyMedia.id, local)));
    if (photos.length !== local.length) throw new CompanyError(400, 'Vali selle ettevõtte üleslaaditud fotod.');
   }
   const values = { content, status: action === 'submit' ? 'pending' as const : 'draft' as const, note: '', updatedAt: new Date() };
   const [saved] = current
    ? await db.update(productListings).set({ ...values, version: current.version + 1 })
     .where(and(match, eq(productListings.version, current.version))).returning()
    : await db.insert(productListings).values({ id, companyId, ...values }).onConflictDoNothing().returning();
   return companyProduct(saved ?? conflict());
  },

  async catalog(userId: string, companyId: string, input: ShopConnectionInput, cursor: string | null) {
   await ownerCompany(userId, companyId);
   const connection = normalizeShop(input);
   const { url, platform } = connection;
   const [existing] = await db.select().from(productShops).where(and(
    eq(productShops.companyId, companyId), eq(productShops.platform, platform), eq(productShops.url, url),
   ));
   const wixSiteId = input.wix?.siteId.toLowerCase();
   if (wixSiteId && existing?.wixSiteId && existing.wixSiteId !== wixSiteId) {
    throw new CompanyError(409, 'See aadress on ühendatud teise Wixi saidiga.');
   }
   const wix = input.wix && wixSiteId ? { siteId: wixSiteId, apiKey: input.wix.apiKey } : undefined;
   const encrypted = wix ? encryptWixKey(wix.apiKey, { companyId, url, wixSiteId: wix.siteId }) : undefined;
   const resolved = wix ? { ...connection, wix } : existing ? catalogConnection(existing) : connection;
   const page = await catalog.page(resolved, cursor);
   const [saved] = !existing || wix ? await db.insert(productShops).values({
    platform, url, companyId, wixSiteId, wixApiKey: encrypted,
   }).onConflictDoUpdate({
    target: [productShops.companyId, productShops.platform, productShops.url],
    set: { url, ...(wix ? { wixSiteId: wix.siteId, wixApiKey: encrypted } : {}) },
    ...(wix ? { setWhere: or(isNull(productShops.wixSiteId), eq(productShops.wixSiteId, wix.siteId)) } : {}),
   }).returning({ id: productShops.id, platform: productShops.platform, url: productShops.url }) : [existing];
   if (!saved) throw new CompanyError(409, 'See aadress on ühendatud teise Wixi saidiga.');
   const shop = { id: saved.id, platform: saved.platform, url: saved.url };
   const imported = await db.select({ sourceId: productListings.sourceId }).from(productListings).where(eq(productListings.shopId, shop.id));
   return { ...page, shop, imported: imported.map(item => item.sourceId) };
  },

  async import(userId: string, companyId: string, shopId: string, cursor: string | null, sourceIds: string[]) {
   await ownerCompany(userId, companyId);
   const [shop] = await db.select().from(productShops).where(and(eq(productShops.companyId, companyId), eq(productShops.id, shopId)));
   if (!shop) throw new CompanyError(404, 'E-poodi ei leitud.');
   const requested = new Set(sourceIds);
   const { items } = await catalog.page(catalogConnection(shop), cursor);
   const selected = items.filter(item => requested.has(item.sourceId));
   if (new Set(selected.map(item => item.sourceId)).size !== requested.size) throw new CompanyError(409, 'E-poe tootevalik on muutunud. Laadi leht uuesti.');
   const now = new Date();
   const inserted = await db.insert(productListings).values(selected.map(item => ({
    id: randomUUID(), companyId, shopId, sourceId: item.sourceId, storeData: syncedData(item), syncedAt: now,
    content: {
     title: item.title, description: item.description, category: productCategories[5], photos: item.photos,
     priceCents: item.priceCents, availability: item.availability, shopUrl: item.url, variants: [],
    },
   }))).onConflictDoNothing({ target: [productListings.shopId, productListings.sourceId] }).returning();
   return inserted.map(companyProduct);
  },

  async help(userId: string, companyId: string, input: ProductHelpInput) {
   await ownerCompany(userId, companyId);
   await db.insert(productHelpRequests).values({
    id: input.id, companyId, shopUrl: input.shopUrl, email: input.email, message: input.message,
   }).onConflictDoNothing();
  },

  async helpQueue() {
   const items = await db.select({
    id: productHelpRequests.id, companyName: companies.name, shopUrl: productHelpRequests.shopUrl,
    email: productHelpRequests.email, message: productHelpRequests.message, createdAt: productHelpRequests.createdAt,
   }).from(productHelpRequests).innerJoin(companies, eq(companies.id, productHelpRequests.companyId))
    .where(isNull(productHelpRequests.resolvedAt)).orderBy(productHelpRequests.createdAt);
   return items;
  },

  async resolveHelp(id: string) {
   await db.update(productHelpRequests).set({ resolvedAt: new Date() }).where(and(eq(productHelpRequests.id, id), isNull(productHelpRequests.resolvedAt)));
  },

  async queue() {
   return db.select({ product: productListings, companyName: companies.name }).from(productListings)
    .innerJoin(companies, eq(companies.id, productListings.companyId))
    .where(eq(productListings.status, 'pending')).orderBy(productListings.updatedAt);
  },

  async review(id: string, version: number, decision: 'approve' | 'reject', note: string) {
   const [saved] = await db.update(productListings).set({
    status: decision === 'approve' ? 'approved' : 'rejected',
    ...(decision === 'approve' ? { published: productListings.content } : {}),
    version: version + 1, note, updatedAt: new Date(),
   }).where(and(eq(productListings.id, id), eq(productListings.version, version), eq(productListings.status, 'pending'))).returning();
   return companyProduct(saved ?? conflict());
  },

  async list(query: string, slug?: string, offset = 0) {
   const pattern = '%' + query.replace(/[\\%_]/g, '\\$&') + '%';
   const rows = await publicRows().where(and(eq(companies.status, 'published'), eq(productListings.visible, true), isNotNull(productListings.published),
    slug ? eq(companies.slug, slug) : undefined,
    query ? or(ilike(sql`${productListings.published}->>'title'`, pattern), ilike(sql`${productListings.published}->>'description'`, pattern),
     ilike(sql`${productListings.published}->>'category'`, pattern), ilike(companies.name, pattern), ilike(companies.brandName, pattern)) : undefined,
   )).orderBy(desc(productListings.updatedAt), desc(productListings.id)).offset(offset).limit(41);
   return { items: rows.slice(0, 40).map(toPublic), hasMore: rows.length > 40 };
  },

  async detail(id: string) {
   const [row] = await publicRows().where(and(eq(productListings.id, id), eq(companies.status, 'published'),
    eq(productListings.visible, true), isNotNull(productListings.published)));
   return row ? toPublic(row) : null;
  },

  async sync() {
   const now = new Date();
   const due = new Date(now.getTime() - syncInterval);
   const pending = or(isNull(productListings.attemptedAt), lt(productListings.attemptedAt, due));
   const active = and(eq(productListings.visible, true), isNotNull(productListings.published), pending);
   const rows = await db.select({ id: productListings.id, sourceId: productListings.sourceId, shop: productShops }).from(productListings)
    .innerJoin(productShops, eq(productShops.id, productListings.shopId))
    .innerJoin(companies, eq(companies.id, productListings.companyId))
    .where(and(active, eq(companies.status, 'published')))
    .orderBy(asc(sql`coalesce(${productListings.attemptedAt}, to_timestamp(0))`)).limit(8);
   await Promise.all(rows.map(async row => {
    const [claimed] = await db.update(productListings).set({ attemptedAt: now })
     .where(and(eq(productListings.id, row.id), active)).returning({ id: productListings.id });
    if (!claimed || !row.sourceId) return;
    try {
     const item = await catalog.get(catalogConnection(row.shop), row.sourceId);
     await db.update(productListings).set({ storeData: item ? syncedData(item) : null, syncedAt: new Date() })
      .where(and(eq(productListings.id, row.id), eq(productListings.attemptedAt, now)));
    } catch {
     // A temporary store error leaves the last successful snapshot available until it expires.
    }
   }));
  },
 };
}
