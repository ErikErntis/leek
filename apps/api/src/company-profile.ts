import { and, eq, desc, inArray } from 'drizzle-orm';
import { companies, companyContacts, companyProfileRevisions, companyMedia, memberships, type createDatabase } from '@leek/db';
import { ownProfileSchema, type PublicProfileInput, type ProfileSave } from '@leek/contracts';
import { CompanyError } from './company-service';

type Database = ReturnType<typeof createDatabase>['db'];
const fields = ['image','logo','name','brandName','category','additionalCategories','municipality','settlement','address','email','phone','website','employees','tagline','description'] as const;
function equalProfile(a: Record<string, unknown>, b: Record<string, unknown>) {
 return fields.every(key => JSON.stringify(a[key] ?? '') === JSON.stringify(b[key] ?? a[key] ?? ''));
}
export function createProfileService(db: Database) {
 async function membership(tx: Database, userId: string, companyId: string) {
  const [member] = await tx.select().from(memberships).where(and(eq(memberships.userId,userId),eq(memberships.companyId,companyId),eq(memberships.role,'owner')));
  if (!member) throw new CompanyError(404,'Ettevõtet ei leitud.');
 }
 async function read(companyId: string) {
  const [company] = await db.select().from(companies).where(eq(companies.id,companyId));
  if (!company) throw new CompanyError(404,'Ettevõtet ei leitud.');
  const [contact] = await db.select().from(companyContacts).where(eq(companyContacts.companyId,companyId));
  const [revision] = await db.select().from(companyProfileRevisions).where(eq(companyProfileRevisions.companyId,companyId)).orderBy(desc(companyProfileRevisions.createdAt),desc(companyProfileRevisions.id)).limit(1);
  return ownProfileSchema.parse({company:{...company,createdAt:company.createdAt.toISOString(),reviewedAt:company.reviewedAt?.toISOString()??null,contact:contact??null},version:company.profileVersion,revision:revision?{...revision,createdAt:revision.createdAt.toISOString()}:null});
 }
 return {
  async own(userId: string, id: string) { await membership(db,userId,id); return read(id); },
  async save(userId: string, id: string, input: ProfileSave) {
   await db.transaction(async raw => {
    const tx = raw as unknown as Database;
    await membership(tx,userId,id);
    const [company] = await tx.select().from(companies).where(eq(companies.id,id)).for('update');
    if (!company) throw new CompanyError(404,'Ettevõtet ei leitud.');
    input = {...input, publicProfile:{...input.publicProfile,image:input.publicProfile.image??company.image,logo:input.publicProfile.logo??company.logo}};
    for (const kind of ['image','logo'] as const) {
     const value=input.publicProfile[kind];
     if(value===company[kind] || (kind==='logo' && value===''))continue;
     const mediaId=value?.match(/^\/api\/media\/([a-f0-9-]{36})$/)?.[1];
     const [asset]=mediaId?await tx.select().from(companyMedia).where(and(eq(companyMedia.id,mediaId),eq(companyMedia.companyId,id),eq(companyMedia.kind,kind))):[];
     if(!asset)throw new CompanyError(400,'Laadi pilt üles selle ettevõtte profiilis.');
    }
    if (company.profileVersion !== input.version) throw new CompanyError(409,'Ettevõtte andmed on vahepeal muutunud. Laadi profiil uuesti ja võrdle oma muudatusi.');
    const [pending] = await tx.select().from(companyProfileRevisions).where(and(eq(companyProfileRevisions.companyId,id),eq(companyProfileRevisions.status,'pending')));
    if (company.status === 'pending' && !equalProfile(company,input.publicProfile)) throw new CompanyError(409,'Ettevõtte esmane taotlus on ülevaatamisel. Avalikke andmeid saab muuta pärast otsust.');
    await tx.insert(companyContacts).values({companyId:id,...input.contact}).onConflictDoUpdate({target:companyContacts.companyId,set:input.contact});
    const changed = !equalProfile(company,input.publicProfile);
    if (company.status === 'published') {
     if (pending && (!changed || !equalProfile(pending.content,input.publicProfile))) await tx.update(companyProfileRevisions).set({status:'superseded'}).where(eq(companyProfileRevisions.id,pending.id));
     if (changed && (!pending || !equalProfile(pending.content,input.publicProfile))) await tx.insert(companyProfileRevisions).values({companyId:id,submittedBy:userId,content:input.publicProfile});
     await tx.update(companies).set({profileVersion:company.profileVersion+1,updatedAt:new Date()}).where(eq(companies.id,id));
    } else {
     // A rejected/draft company has no live profile to preserve; edits resubmit it.
     await tx.update(companies).set({...input.publicProfile,status:'pending',reviewNote:'',reviewedAt:null,reviewedBy:null,profileVersion:company.profileVersion+1,updatedAt:new Date()}).where(eq(companies.id,id));
    }
   });
   return read(id);
  },
  async queue() {
   const items = await db.select({id:companyProfileRevisions.id,companyId:companies.id,name:companies.name,brandName:companies.brandName,createdAt:companyProfileRevisions.createdAt}).from(companyProfileRevisions).innerJoin(companies,eq(companies.id,companyProfileRevisions.companyId)).where(eq(companyProfileRevisions.status,'pending')).orderBy(companyProfileRevisions.createdAt).limit(100);
   return {items:items.map(row=>({...row,createdAt:row.createdAt.toISOString()}))};
  },
  async reviewDetail(id: string) {
   const [revision] = await db.select().from(companyProfileRevisions).where(eq(companyProfileRevisions.id,id));
   if (!revision) throw new CompanyError(404,'Muudatust ei leitud.');
   const [company] = await db.select().from(companies).where(eq(companies.id,revision.companyId));
   return {id:revision.id,status:revision.status,note:revision.note,before:Object.fromEntries(fields.map(key=>[key,company![key]])) as PublicProfileInput,after:revision.content,companyName:company!.name};
  },
  async review(adminId: string, id: string, decision: 'approve'|'reject', note: string) {
   const [lookup] = await db.select().from(companyProfileRevisions).where(eq(companyProfileRevisions.id,id));
   if (!lookup) throw new CompanyError(404,'Muudatust ei leitud.');
   await db.transaction(async raw => {
    const tx = raw as unknown as Database;
    const [company] = await tx.select().from(companies).where(eq(companies.id,lookup.companyId)).for('update');
    const [revision] = await tx.select().from(companyProfileRevisions).where(eq(companyProfileRevisions.id,id)).for('update');
    if (!company || company.status!=='published' || revision?.status!=='pending') throw new CompanyError(409,'Muudatus on juba üle vaadatud või esitatud uuesti. Värskenda järjekorda.');
    if (decision==='approve') await tx.update(companies).set({...revision.content,profileVersion:company.profileVersion+1,updatedAt:new Date()}).where(eq(companies.id,company.id));
    else await tx.update(companies).set({profileVersion:company.profileVersion+1}).where(eq(companies.id,company.id));
    await tx.update(companyProfileRevisions).set({status:decision==='approve'?'approved':'rejected',note,reviewedBy:adminId,reviewedAt:new Date()}).where(eq(companyProfileRevisions.id,id));
   });
   return {ok:true};
  },
 };
}
