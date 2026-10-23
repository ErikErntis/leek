import { and, eq, gte, desc, count, sql } from 'drizzle-orm';
import { companies, companyContacts, memberships, users, type createDatabase } from '@leek/db';
import { privateCompanySchema, type CompanySubmission } from '@leek/contracts';

type Database = ReturnType<typeof createDatabase>['db'];
export class CompanyError extends Error {
  constructor(public status: 400 | 404 | 409 | 429, message: string) { super(message); }
}

export function createCompanyService(db: Database) {
  async function detail(id: string) {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    if (!company) throw new CompanyError(404, 'Ettevõtet ei leitud.');
    const [contact] = await db.select().from(companyContacts).where(eq(companyContacts.companyId, id));
    return privateCompanySchema.parse({ ...company, createdAt: company.createdAt.toISOString(), reviewedAt: company.reviewedAt?.toISOString() ?? null, contact: contact ?? null });
  }
  return {
    async isAdmin(userId: string) {
      const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
      return user?.role === 'admin';
    },
    async submit(userId: string, input: CompanySubmission) {
      try {
        return await db.transaction(async tx => {
          // Serialize submissions per account across API replicas, including retries.
          await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
          const [existing] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.registrationCode, input.registrationCode));
          if (existing) {
            const [member] = await tx.select().from(memberships).where(and(eq(memberships.companyId, existing.id), eq(memberships.userId, userId)));
            if (member?.role === 'owner') return { id: existing.id, created: false };
            throw new CompanyError(409, 'Selle registrikoodiga ettevõte on juba lisatud.');
          }
          const [recent] = await tx.select({ total: count() }).from(companies).where(and(eq(companies.submittedBy, userId), gte(companies.createdAt, new Date(Date.now() - 86400000))));
          if (recent!.total >= 5) throw new CompanyError(429, 'Oled viimase 24 tunni jooksul juba viis ettevõtet esitanud. Palun proovi hiljem uuesti.');
          const slugBase = input.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 75) || 'ettevote';
          const [company] = await tx.insert(companies).values({
            name: input.name, registrationCode: input.registrationCode, slug: `${slugBase}-${input.registrationCode}`,
            category: input.category, additionalCategories: input.additionalCategories,
            municipality: input.municipality, settlement: input.settlement, address: input.address,
            email: input.email, phone: input.phone, website: input.website,
            employees: input.employees, tagline: input.tagline, description: input.description,
            requestedPlan: input.requestedPlan,
            preferredSubscription: input.requestedPlan === 'visibility' ? 2 : input.requestedPlan === 'employer' ? 3 : 1,
            currentSubscription: null, submittedBy: userId,
            // Approval and payment are separate: no paid privileges from a form value.
            status: 'pending', plan: 'free', featured: false, services: [],
          }).returning({ id: companies.id });
          const id = company!.id;
          await tx.insert(companyContacts).values({ companyId: id, name: input.contactName, role: input.contactRole, email: input.contactEmail, phone: input.contactPhone });
          await tx.insert(memberships).values({ companyId: id, userId, role: 'owner' });
          return { id, created: true };
        });
      } catch (error) {
        const code = (error as { code?: string; cause?: { code?: string } }).code ?? (error as { cause?: { code?: string } }).cause?.code;
        if (code === '23505') throw new CompanyError(409, 'Selle registrikoodiga ettevõte on juba lisatud.');
        throw error;
      }
    },
    async ownDetail(userId: string, id: string) {
      const [member] = await db.select().from(memberships).where(and(eq(memberships.userId, userId), eq(memberships.companyId, id)));
      if (!member) throw new CompanyError(404, 'Ettevõtet ei leitud.');
      return detail(id);
    },
    detail,
    async list(status: 'pending' | 'published' | 'rejected' | 'all', offset: number) {
      const rows = await db.select({ id: companies.id, slug: companies.slug, name: companies.name, category: companies.category, municipality: companies.municipality, status: companies.status, requestedPlan: companies.requestedPlan, createdAt: companies.createdAt }).from(companies)
        .where(status === 'all' ? undefined : eq(companies.status, status)).orderBy(desc(companies.createdAt), desc(companies.id)).limit(41).offset(offset);
      return { items: rows.slice(0, 40).map(row => ({ ...row, createdAt: row.createdAt.toISOString() })), hasMore: rows.length > 40 };
    },
    async review(adminId: string, id: string, decision: 'approve' | 'reject', note: string) {
      const [updated] = await db.update(companies).set({ profileVersion: sql`${companies.profileVersion} + 1`, status: decision === 'approve' ? 'published' : 'rejected', reviewNote: note, reviewedBy: adminId, reviewedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(companies.id, id), eq(companies.status, 'pending'))).returning({ id: companies.id });
      if (!updated) throw new CompanyError(409, 'Ettevõte on juba üle vaadatud või seda ei leitud. Värskenda lehte.');
      return detail(id);
    },
  };
}
