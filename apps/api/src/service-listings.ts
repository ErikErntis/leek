import { and, asc, desc, eq, exists, gte, ilike, inArray, isNotNull, lte, or, sql } from 'drizzle-orm';
import { companies, companyMedia, memberships, serviceListings, type createDatabase } from '@leek/db';
import { catalogPageSize, type PublicService, type ServiceCatalogFilters, type ServiceSave } from '@leek/contracts';
import { CompanyError } from './company-service';

type Database = ReturnType<typeof createDatabase>['db'];

export function createServiceListings(db: Database) {
 async function ownerCompany(userId: string, companyId: string) {
  const [company] = await db.select({ status: companies.status }).from(companies)
   .innerJoin(memberships, eq(memberships.companyId, companies.id))
   .where(and(eq(companies.id, companyId), eq(memberships.userId, userId), eq(memberships.role, 'owner')));
  if (!company) throw new CompanyError(404, 'Ettevõtet ei leitud.');
  return company;
 }

 const publicRows = () => db.select({
  id: serviceListings.id,
  content: serviceListings.published,
  company: { slug: companies.slug, name: companies.name, brandName: companies.brandName, email: companies.email, logo: companies.logo },
 }).from(serviceListings).innerJoin(companies, eq(companies.id, serviceListings.companyId));

 const publiclyListed = and(eq(serviceListings.visible, true), isNotNull(serviceListings.published));

 function toPublic(row: Awaited<ReturnType<typeof publicRows>>[number]): PublicService {
  return { ...row.content!, id: row.id, company: row.company };
 }

 function conflict(): never {
  throw new CompanyError(409, 'Teenust on vahepeal muudetud. Värskenda lehte.');
 }

 return {
  async own(userId: string, companyId: string) {
   await ownerCompany(userId, companyId);
   return db.select().from(serviceListings).where(eq(serviceListings.companyId, companyId)).orderBy(desc(serviceListings.updatedAt));
  },

  async save(userId: string, companyId: string, input: ServiceSave) {
   const company = await ownerCompany(userId, companyId);
   const { id, version, content, action } = input;
   const match = and(eq(serviceListings.id, id), eq(serviceListings.companyId, companyId));
   const [current] = await db.select().from(serviceListings).where(match);
   if ((current?.version ?? null) !== version) conflict();

   if (action === 'hide' || action === 'show') {
    if (!current?.published) throw new CompanyError(409, 'Teenus tuleb enne kinnitada.');
    const [updated] = await db.update(serviceListings)
     .set({ visible: action === 'show', version: current.version + 1, updatedAt: new Date() })
     .where(and(match, eq(serviceListings.version, current.version))).returning();
    return updated ?? conflict();
   }

   if (current?.status === 'pending') throw new CompanyError(409, 'Teenus ootab halduri otsust.');
   if (!content) throw new CompanyError(400, 'Lisa teenuse andmed.');
   if (action === 'submit') {
    if (company.status !== 'published') throw new CompanyError(409, 'Teenus saab ülevaatusele minna pärast ettevõtte kinnitamist.');
    if (content.title.length < 3 || content.description.length < 10) {
     throw new CompanyError(400, 'Lisa teenuse nimi ja kirjeldus.');
    }
    if (content.pricing === 'fixed') {
     const packages = content.packages ?? [];
     if (packages.length ? packages.some(item => !item.title || item.priceCents === null) : content.priceCents === null) {
      throw new CompanyError(400, 'Lisa teenuse hind või täida iga paketi nimi ja hind.');
     }
    }
   }
   if (content.photo) {
    const mediaId = content.photo.slice('/api/media/'.length);
    const [photo] = await db.select({ id: companyMedia.id }).from(companyMedia)
     .where(and(eq(companyMedia.id, mediaId), eq(companyMedia.companyId, companyId), eq(companyMedia.kind, 'image')));
    if (!photo) throw new CompanyError(400, 'Vali selle ettevõtte üleslaaditud foto.');
   }

   const values = { content, status: action === 'submit' ? 'pending' as const : 'draft' as const, note: '', updatedAt: new Date() };
   const [saved] = current
    ? await db.update(serviceListings).set({ ...values, version: current.version + 1 })
     .where(and(match, eq(serviceListings.version, current.version))).returning()
    : await db.insert(serviceListings).values({ id, companyId, ...values }).onConflictDoNothing().returning();
   return saved ?? conflict();
  },

  async queue() {
   return db.select({ listing: serviceListings, companyName: companies.name }).from(serviceListings)
    .innerJoin(companies, eq(companies.id, serviceListings.companyId))
    .where(eq(serviceListings.status, 'pending')).orderBy(serviceListings.updatedAt);
  },

  async review(id: string, version: number, decision: 'approve' | 'reject', note: string) {
   const [updated] = await db.update(serviceListings).set({
    status: decision === 'approve' ? 'approved' : 'rejected',
    ...(decision === 'approve' ? { published: serviceListings.content } : {}),
    note, version: version + 1, updatedAt: new Date(),
   }).where(and(eq(serviceListings.id, id), eq(serviceListings.version, version), eq(serviceListings.status, 'pending'))).returning();
   return updated ?? conflict();
  },

  async list(query: string, slug?: string, offset = 0,
   filters: ServiceCatalogFilters = { category: [], area: [], sort: 'recent' }, includeCompanies = false) {
   const published = serviceListings.published;
   const category = sql`${published}->>'category'`;
   const area = sql`${published}->>'area'`;
   const pricing = sql`${published}->>'pricing'`;
   const price = sql<number | null>`case when ${pricing} = 'fixed' then coalesce(
    (select min((package->>'priceCents')::integer) from jsonb_array_elements(${published}->'packages') as package),
    (${published}->>'priceCents')::integer
   ) end`;
   const pattern = '%' + query.replace(/[\\%_]/g, '\\$&') + '%';
   const primaryOrder = {
    recent: desc(serviceListings.updatedAt),
    'price-asc': sql`${price} asc nulls last`,
    'price-desc': sql`${price} desc nulls last`,
    name: asc(sql`lower(${published}->>'title')`),
   }[filters.sort];
   const rowsQuery = publicRows().where(and(
    eq(companies.status, 'published'), publiclyListed,
    slug ? eq(companies.slug, slug) : undefined,
    query ? or(
     ilike(sql`${published}->>'title'`, pattern),
     ilike(sql`${published}->>'description'`, pattern),
     ilike(category, pattern), ilike(area, pattern),
     sql`exists (
      select 1 from jsonb_array_elements_text(${published}->'areas') as service_area(value)
      where service_area.value ilike ${pattern}
     )`,
     ilike(companies.name, pattern), ilike(companies.brandName, pattern),
    ) : undefined,
    filters.category.length ? inArray(category, filters.category) : undefined,
    filters.area.length ? or(inArray(area, filters.area), sql`exists (
     select 1 from jsonb_array_elements_text(${published}->'areas') as service_area(value)
     where ${inArray(sql`service_area.value`, filters.area)}
    )`) : undefined,
    filters.pricing ? eq(pricing, filters.pricing) : undefined,
    filters.min === undefined ? undefined : gte(price, filters.min),
    filters.max === undefined ? undefined : lte(price, filters.max),
   )).orderBy(primaryOrder, desc(serviceListings.id)).offset(offset).limit(catalogPageSize + 1);
   const companiesQuery = includeCompanies ? db.select({ slug: companies.slug, name: companies.name, brandName: companies.brandName })
    .from(companies).where(and(eq(companies.status, 'published'), exists(db.select({ id: serviceListings.id })
     .from(serviceListings).where(and(eq(serviceListings.companyId, companies.id), publiclyListed))))) : undefined;
   const [rows, providers] = await Promise.all([rowsQuery, companiesQuery]);
   return {
    items: rows.slice(0, catalogPageSize).map(toPublic),
    hasMore: rows.length > catalogPageSize,
    ...(providers ? { companies: providers } : {}),
   };
  },

  async detail(id: string) {
   const [row] = await publicRows().where(and(eq(serviceListings.id, id), eq(companies.status, 'published'),
    eq(serviceListings.visible, true), isNotNull(serviceListings.published)));
   return row ? toPublic(row) : null;
  },
 };
}
