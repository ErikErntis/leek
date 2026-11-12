import { and, desc, eq, ilike, isNotNull, or, sql } from 'drizzle-orm';
import { companies, companyMedia, memberships, serviceListings, type createDatabase } from '@leek/db';
import type { PublicService, ServiceSave } from '@leek/contracts';
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
    if (content.title.length < 3 || content.description.length < 10 || (content.pricing === 'fixed' && content.priceCents === null)) {
     throw new CompanyError(400, 'Lisa teenuse nimi, kirjeldus ja kindla hinna korral hind.');
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

  async list(query: string, slug?: string, offset = 0) {
   const pattern = '%' + query.replace(/[\\%_]/g, '\\$&') + '%';
   const rows = await publicRows().where(and(
    eq(companies.status, 'published'), eq(serviceListings.visible, true), isNotNull(serviceListings.published),
    slug ? eq(companies.slug, slug) : undefined,
    query ? or(
     ilike(sql`${serviceListings.published}->>'title'`, pattern),
     ilike(sql`${serviceListings.published}->>'description'`, pattern),
     ilike(sql`${serviceListings.published}->>'category'`, pattern),
     ilike(sql`${serviceListings.published}->>'area'`, pattern),
     ilike(companies.name, pattern), ilike(companies.brandName, pattern),
    ) : undefined,
   )).orderBy(desc(serviceListings.updatedAt), desc(serviceListings.id)).offset(offset).limit(41);
   return { items: rows.slice(0, 40).map(toPublic), hasMore: rows.length > 40 };
  },

  async detail(id: string) {
   const [row] = await publicRows().where(and(eq(serviceListings.id, id), eq(companies.status, 'published'),
    eq(serviceListings.visible, true), isNotNull(serviceListings.published)));
   return row ? toPublic(row) : null;
  },
 };
}
