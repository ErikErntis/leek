import { and, desc, eq, exists, isNotNull, isNull, sql } from 'drizzle-orm';
import { companies, inquiries, inquiryMessages, inquiryOffers, memberships, productListings, serviceListings, users, type createDatabase } from '@leek/db';
import type { InquiryAction, InquiryCreate, InquiryKind, InquirySide, InquirySnapshot, InquirySummary, InquiryThread } from '@leek/contracts';
import { CompanyError } from './company-service';

type Database = ReturnType<typeof createDatabase>['db'];
const pageSize = 30;
const messagePageSize = 60;
const missing = () => new CompanyError(404, 'Päringut ei leitud.');

export function createInquiries(db: Database) {
 function authorized(userId: string, companyId?: string) {
  return companyId ? and(
   eq(inquiries.companyId, companyId),
   exists(db.select({ userId: memberships.userId }).from(memberships).where(and(
    eq(memberships.companyId, companyId), eq(memberships.userId, userId), eq(memberships.role, 'owner'),
   ))),
  ) : eq(inquiries.customerId, userId);
 }

 const readRows = () => db.select({
  id: inquiries.id, companyId: inquiries.companyId,
  companyName: sql<string>`coalesce(nullif(${companies.brandName}, ''), ${companies.name})`,
  customerName: users.name, kind: inquiries.kind, status: inquiries.status, snapshot: inquiries.snapshot,
  location: inquiries.location, desiredDate: inquiries.desiredDate, updatedAt: inquiries.updatedAt,
 }).from(inquiries).innerJoin(companies, eq(companies.id, inquiries.companyId)).innerJoin(users, eq(users.id, inquiries.customerId));

 function summarize(row: Awaited<ReturnType<typeof readRows>>[number]): InquirySummary {
  const { id, companyId, companyName, customerName, kind, status, snapshot, updatedAt } = row;
  return { id, companyId, companyName, customerName, kind, status, snapshot, updatedAt: updatedAt.toISOString() };
 }

 return {
  async create(userId: string, input: InquiryCreate) {
   return db.transaction(async tx => {
    const [existing] = await tx.select({ customerId: inquiries.customerId }).from(inquiries).where(eq(inquiries.id, input.id));
    if (existing) {
     if (existing.customerId !== userId) throw missing();
     return { id: input.id };
    }

    let companyId: string;
    let kind: InquiryKind;
    let snapshot: InquirySnapshot;
    if (input.source === 'product') {
     const [row] = await tx.select({ content: productListings.published, companyId: productListings.companyId })
      .from(productListings).innerJoin(companies, eq(companies.id, productListings.companyId))
      .where(and(eq(productListings.id, input.listingId), eq(productListings.visible, true), isNull(productListings.shopId),
       isNotNull(productListings.published), eq(companies.status, 'published')));
     if (!row?.content || row.content.shopUrl) throw new CompanyError(404, 'Selle toote kohta ei saa siin päringut esitada.');
     const variants = row.content.variants;
     const variant = variants.find(item => item.id === input.optionId);
     if ((variants.length > 0 || input.optionId) && !variant) throw new CompanyError(409, 'Toote variandid on muutunud. Vali variant uuesti.');
     companyId = row.companyId;
     kind = 'product';
     snapshot = { listingId: input.listingId, title: row.content.title, optionTitle: variant?.name ?? null,
      priceCents: variant ? variant.priceCents : row.content.priceCents, quantity: input.quantity };
    } else {
     const [row] = await tx.select({ content: serviceListings.published, companyId: serviceListings.companyId })
      .from(serviceListings).innerJoin(companies, eq(companies.id, serviceListings.companyId))
      .where(and(eq(serviceListings.id, input.listingId), eq(serviceListings.visible, true),
       isNotNull(serviceListings.published), eq(companies.status, 'published')));
     if (!row?.content) throw new CompanyError(404, 'Teenust ei leitud.');
     const fixed = row.content.pricing === 'fixed';
     const packages = fixed ? row.content.packages ?? [] : [];
     const selected = packages.find(item => item.id === input.optionId);
     if ((packages.length > 0 || input.optionId) && !selected) throw new CompanyError(409, 'Teenuse paketid on muutunud. Vali pakett uuesti.');
     const priceCents = fixed ? (selected ? selected.priceCents : row.content.priceCents) : null;
     if (input.expectedPriceCents !== priceCents || (fixed && priceCents === null)) {
      throw new CompanyError(409, 'Teenuse hind on muutunud. Ava teenuseleht uuesti.');
     }
     companyId = row.companyId;
     kind = fixed ? 'fixed_service' : 'service_quote';
     snapshot = { listingId: input.listingId, title: row.content.title, optionTitle: selected?.title ?? null, priceCents, quantity: 1 };
    }

    const [inserted] = await tx.insert(inquiries).values({
     id: input.id, customerId: userId, companyId, kind, snapshot,
     location: input.source === 'service' ? input.location : null,
     desiredDate: input.source === 'service' ? input.desiredDate : null,
    }).onConflictDoNothing().returning({ id: inquiries.id });
    if (!inserted) {
     const [winner] = await tx.select({ customerId: inquiries.customerId }).from(inquiries).where(eq(inquiries.id, input.id));
     if (winner?.customerId !== userId) throw missing();
     return { id: input.id };
    }
    await tx.insert(inquiryMessages).values({ id: input.id, inquiryId: input.id, side: 'customer', body: input.message });
    return { id: input.id };
   });
  },

  async list(userId: string, companyId: string | undefined, offset: number) {
   const rows = await readRows().where(authorized(userId, companyId)).orderBy(desc(inquiries.updatedAt), desc(inquiries.id)).offset(offset).limit(pageSize + 1);
   return { items: rows.slice(0, pageSize).map(summarize), nextOffset: rows.length > pageSize ? offset + pageSize : null };
  },

  async detail(userId: string, id: string, companyId: string | undefined, offset: number): Promise<InquiryThread> {
   const [row] = await readRows().where(and(eq(inquiries.id, id), authorized(userId, companyId)));
   if (!row) throw missing();
   const [messages, offers] = await Promise.all([
    db.select().from(inquiryMessages).where(eq(inquiryMessages.inquiryId, id))
     .orderBy(desc(inquiryMessages.createdAt), desc(inquiryMessages.id)).offset(offset).limit(messagePageSize + 1),
    db.select().from(inquiryOffers).where(eq(inquiryOffers.inquiryId, id)).orderBy(desc(inquiryOffers.createdAt), desc(inquiryOffers.id)),
   ]);
   return {
    ...summarize(row), location: row.location, desiredDate: row.desiredDate, hasOlder: messages.length > messagePageSize,
    messages: messages.slice(0, messagePageSize).reverse().map(({ id, side, body, createdAt }) => ({ id, side, body, createdAt: createdAt.toISOString() })),
    offers: offers.map(({ id, priceCents, proposedDate, message, status, createdAt }) => ({ id, priceCents, proposedDate, message, status, createdAt: createdAt.toISOString() })),
   };
  },

  async act(userId: string, id: string, companyId: string | undefined, action: InquiryAction) {
   const side: InquirySide = companyId ? 'company' : 'customer';
   await db.transaction(async tx => {
    const [thread] = await tx.select({ kind: inquiries.kind, status: inquiries.status }).from(inquiries)
     .where(and(eq(inquiries.id, id), authorized(userId, companyId))).for('update');
    if (!thread) throw missing();
    const touch = () => tx.update(inquiries).set({ updatedAt: new Date() }).where(eq(inquiries.id, id));

    if (action.action === 'reply') {
     const [message] = await tx.insert(inquiryMessages).values({ id: action.id, inquiryId: id, side, body: action.message })
      .onConflictDoNothing().returning({ id: inquiryMessages.id });
     if (message) await touch();
     return;
    }
    if (action.action === 'offer') {
     if (side !== 'company' || thread.kind !== 'service_quote') throw missing();
     const [existing] = await tx.select({ id: inquiryOffers.id }).from(inquiryOffers)
      .where(and(eq(inquiryOffers.id, action.id), eq(inquiryOffers.inquiryId, id)));
     if (existing) return;
     if (thread.status !== 'open') throw new CompanyError(409, 'Päringu kohta on otsus juba tehtud.');
     await tx.update(inquiryOffers).set({ status: 'replaced' }).where(and(eq(inquiryOffers.inquiryId, id), eq(inquiryOffers.status, 'pending')));
     const [inserted] = await tx.insert(inquiryOffers).values({
      id: action.id, inquiryId: id, priceCents: action.priceCents, proposedDate: action.proposedDate, message: action.message,
     }).onConflictDoNothing().returning({ id: inquiryOffers.id });
     if (!inserted) throw new CompanyError(409, 'Pakkumist ei saanud salvestada. Värskenda lehte.');
     await touch();
     return;
    }

    const status = action.decision === 'accept' ? 'accepted' : 'declined';
    if (thread.kind === 'fixed_service' && side === 'company' && action.offerId === null) {
     if (thread.status === status) return;
     if (thread.status !== 'open') throw new CompanyError(409, 'Tellimissoovi kohta on otsus juba tehtud.');
    } else if (thread.kind === 'service_quote' && side === 'customer' && action.offerId) {
     const [offer] = await tx.select({ status: inquiryOffers.status }).from(inquiryOffers)
      .where(and(eq(inquiryOffers.id, action.offerId), eq(inquiryOffers.inquiryId, id)));
     if (offer?.status === status) return;
     if (thread.status !== 'open' || offer?.status !== 'pending') throw new CompanyError(409, 'Pakkumine on muutunud. Värskenda lehte.');
     await tx.update(inquiryOffers).set({ status }).where(eq(inquiryOffers.id, action.offerId));
     if (status === 'declined') {
      await touch();
      return;
     }
    } else {
     throw missing();
    }
    await tx.update(inquiries).set({ status, updatedAt: new Date() }).where(eq(inquiries.id, id));
   });
   return { ok: true };
  },
 };
}
