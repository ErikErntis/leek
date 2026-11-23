import { and, desc, eq } from 'drizzle-orm';
import { companies, jobs, memberships, type createDatabase } from '@leek/db';
import { blankWork, canManageWork, workDeadline, workLoads, workSubmitSchema, workToday, type CompanyWork, type WorkAction, type WorkContent } from '@leek/contracts';
import { CompanyError } from './company-service';

type Database = ReturnType<typeof createDatabase>['db'];
type Row = typeof jobs.$inferSelect;

function ownListing(row: Row): CompanyWork {
 const legacy: WorkContent = {
  ...blankWork('job'), title: row.title, description: row.description,
  load: (Object.entries(workLoads).find(([, label]) => label === row.type)?.[0] ?? 'full') as WorkContent['load'],
  municipality: row.municipality as WorkContent['municipality'],
  deadline: workToday(row.expiresAt),
 };
 let status: CompanyWork['status'];
 if (row.status === 'closed') status = 'closed';
 else if (row.reviewState && row.reviewState !== 'approved') status = row.reviewState;
 else if (row.status === 'published') status = row.expiresAt.getTime() <= Date.now() ? 'expired' : 'published';
 else status = row.status;
 return {
  id: row.id, version: row.version, content: row.content ?? legacy,
  status, note: row.note, published: row.status === 'published' && row.expiresAt.getTime() > Date.now(), updatedAt: row.updatedAt.toISOString(),
 };
}

export function createWorkListings(db: Database) {
 async function owner(userId: string, companyId: string) {
  const [company] = await db.select().from(companies).innerJoin(memberships, eq(companies.id, memberships.companyId))
   .where(and(eq(companies.id, companyId), eq(memberships.userId, userId), eq(memberships.role, 'owner')));
  if (!company) throw new CompanyError(404, 'Ettevõtet ei leitud.');
  return company.companies;
 }
 return {
  async own(userId: string, companyId: string) {
   const company = await owner(userId, companyId);
   const items = await db.select().from(jobs).where(eq(jobs.companyId, companyId)).orderBy(desc(jobs.updatedAt), desc(jobs.id));
   return { items: items.map(ownListing), canManage: canManageWork(company) };
  },
  async save(userId: string, companyId: string, action: WorkAction) {
   return db.transaction(async tx => {
    // Lock both membership and package so permission changes cannot race a submission.
    const [ownership] = await tx.select().from(companies).innerJoin(memberships, eq(companies.id, memberships.companyId))
     .where(and(eq(companies.id, companyId), eq(memberships.userId, userId), eq(memberships.role, 'owner'))).for('update');
    if (!ownership) throw new CompanyError(404, 'Ettevõtet ei leitud.');
    const lockedCompany = ownership.companies;
    const match = and(eq(jobs.id, action.id), eq(jobs.companyId, companyId));
    const [current] = await tx.select().from(jobs).where(match).for('update');
    if ((current?.version ?? null) !== action.version) throw new CompanyError(409, 'Kuulutust on vahepeal muudetud. Laadi nimekiri uuesti.');
    const now = new Date();
    if (action.action === 'close' || action.action === 'withdraw') {
     if (!current) throw new CompanyError(404, 'Kuulutust ei leitud.');
     if (action.action === 'withdraw' && (current.reviewState ?? current.status) !== 'pending') {
      throw new CompanyError(409, 'Ülevaatuselt saab tagasi võtta ainult ootel kuulutuse.');
     }
     const [updated] = await tx.update(jobs).set({
      ...(action.action === 'close' ? { status: 'closed' as const } :
       { status: current.status === 'published' ? 'published' as const : 'draft' as const }),
      reviewState: 'draft', version: current.version + 1, updatedAt: now,
     }).where(match).returning();
     return ownListing(updated!);
    }
    if (!lockedCompany || !canManageWork(lockedCompany)) throw new CompanyError(403, 'Töökuulutuste lisamiseks ja muutmiseks on vajalik aktiivne kolmas pakett Eestvedaja ning kinnitatud ettevõte.');
    if (current?.reviewState === 'pending' || current?.status === 'pending') {
     throw new CompanyError(409, 'Võta kuulutus enne muutmist ülevaatuselt tagasi.');
    }
    const content = action.content;
    if (action.action === 'submit') {
     const valid = workSubmitSchema.safeParse(content);
     if (!valid.success) throw new CompanyError(400, valid.error.issues[0]!.message);
    }
    const contact = {
     ...content,
     contactEmail: content.contactMethod === 'email' ? content.contactEmail : '',
     contactUrl: content.contactMethod === 'url' ? content.contactUrl : '',
    };
    const reviewState = action.action === 'submit' ? 'pending' as const : 'draft' as const;
    const [saved] = current
     ? await tx.update(jobs).set({
      content: contact, reviewState, note: '',
      status: current.status === 'published' ? 'published' : action.action === 'submit' ? 'pending' : 'draft',
      version: current.version + 1, updatedAt: now,
     }).where(match).returning()
     : await tx.insert(jobs).values({
      id: action.id, companyId, slug: `too-${action.id}`, title: content.title, municipality: content.municipality,
      description: content.description, type: content.kind === 'gig' ? 'Tööamps' : workLoads[content.load],
      expiresAt: content.deadline ? workDeadline(content.deadline) : new Date(now.getTime() + 30 * 86400000),
      status: action.action === 'submit' ? 'pending' : 'draft', content: contact, reviewState, updatedAt: now,
     }).onConflictDoNothing().returning();
    if (!saved) throw new CompanyError(409, 'Kuulutus on juba olemas. Laadi nimekiri uuesti.');
    return ownListing(saved);
   });
  },
 };
}
