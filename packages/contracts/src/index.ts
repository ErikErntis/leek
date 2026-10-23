import { z } from 'zod';
export const planSchema = z.enum(['free', 'visibility', 'employer']);
export type Plan = z.infer<typeof planSchema>;
export const companySchema = z.object({
  id: z.string().uuid(), slug: z.string(), name: z.string(), brandName: z.string().optional(), registrationCode: z.string(),
  category: z.string(), municipality: z.string(), tagline: z.string(), description: z.string(),
  email: z.string().email(), phone: z.string(), website: z.union([z.literal(''), z.string().url()]), address: z.string(),
  logo: z.string().optional(), image: z.string(), services: z.array(z.string()), plan: planSchema,
  status: z.enum(['draft', 'pending', 'published', 'rejected']), featured: z.boolean(),
});
export type Company = z.infer<typeof companySchema>;
export const jobSchema = z.object({ id: z.string().uuid(), slug: z.string(), companyId: z.string().uuid(), title: z.string(), municipality: z.string(), type: z.string(), description: z.string(), expiresAt: z.string().datetime(), status: z.enum(['draft', 'pending', 'published', 'closed']) });
export type Job = z.infer<typeof jobSchema>;
export const offerSchema = z.object({ id: z.string().uuid(), companyId: z.string().uuid(), title: z.string(), description: z.string(), expiresAt: z.string().datetime(), status: z.enum(['draft', 'pending', 'published', 'closed']) });
export type Offer = z.infer<typeof offerSchema>;
export const directoryQuerySchema = z.object({ q: z.string().trim().max(120).default(''), category: z.string().max(80).default(''), municipality: z.string().max(80).default('') });
export const categories = ['Ehitus', 'Teenused', 'Toitlustus ja majutus', 'Tootmine', 'Jaemüük'] as const;
export const municipalities = ['Lääne-Harju vald', 'Lääne-Nigula vald', 'Keila linn', 'Haapsalu linn', 'Harku vald'] as const;
export const planNames: Record<Plan, string> = { free: 'Tasuta', visibility: 'Nähtavus', employer: 'Tööandja' };
export type PublicData = { companies: Company[]; jobs: Job[]; offers: Offer[]; source: 'demo' | 'database' };
export function filterCompanies(companies: Company[], query: z.infer<typeof directoryQuerySchema>) {
  const q = query.q.toLocaleLowerCase('et');
  return companies.filter(c => c.status === 'published' && (!query.category || c.category === query.category) && (!query.municipality || c.municipality === query.municipality) && (!q || [c.name, c.brandName, c.tagline, c.description, ...c.services].join(' ').toLocaleLowerCase('et').includes(q)));
}

export const publicDataSchema = z.object({companies:z.array(companySchema),jobs:z.array(jobSchema),offers:z.array(offerSchema),source:z.enum(['demo','database'])});
export function publicProjection(data:PublicData, now=Date.now()):PublicData {
 const companies=data.companies.filter(c=>c.status==='published');
 const ids=new Set(companies.map(c=>c.id));
 const active=(x:{companyId:string;status:string;expiresAt:string})=>ids.has(x.companyId)&&x.status==='published'&&Date.parse(x.expiresAt)>now;
 return publicDataSchema.parse({companies,jobs:data.jobs.filter(active),offers:data.offers.filter(active),source:data.source});
}

export const employeeBands = ['1', '2–9', '10–49', '50–249', '250 või rohkem'] as const;
const phoneInput = z.string().trim().max(30).refine(value => !value || (/^[+\d\s()-]+$/.test(value) && value.replace(/\D/g, '').length >= 5), 'Kontrolli telefoninumbrit.');
const websiteInput = z.string().trim().max(500).refine(value => {
 if (!value) return true;
 try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && url.hostname.includes('.') && !url.username && !url.password; } catch { return false; }
}, 'Kontrolli kodulehe aadressi.');
export const companySubmissionSchema = z.object({
 name:z.string().trim().min(2).max(200), registrationCode:z.string().trim().regex(/^\d{8}$/),
 category:z.enum(categories), additionalCategories:z.array(z.enum(categories)).max(4),
 municipality:z.string().trim().min(2).max(100), settlement:z.string().trim().min(2).max(100), address:z.string().trim().max(200),
 email:z.string().trim().email().max(254), phone:phoneInput, website:websiteInput,
 contactName:z.string().trim().min(2).max(100), contactRole:z.string().trim().max(100), contactEmail:z.string().trim().email().max(254), contactPhone:phoneInput,
 employees:z.enum(employeeBands), tagline:z.string().trim().min(10).max(160), description:z.string().trim().min(30).max(3000),
 regionConfirmed:z.literal(true), requestedPlan:planSchema.default('free'),
}).strict().refine(value => !value.additionalCategories.includes(value.category) && new Set(value.additionalCategories).size === value.additionalCategories.length, {path:['additionalCategories'],message:'Kontrolli lisakategooriaid.'});
export type CompanySubmission = z.infer<typeof companySubmissionSchema>;
export const privateCompanySchema = companySchema.extend({
 additionalCategories:z.array(z.string()), settlement:z.string(), employees:z.string(), requestedPlan:planSchema,
 createdAt:z.string(), reviewedAt:z.string().nullable(), reviewNote:z.string(),
 contact:z.object({name:z.string(),role:z.string(),email:z.string(),phone:z.string()}).nullable(),
});
export type PrivateCompany = z.infer<typeof privateCompanySchema>;
export const companySummarySchema = companySchema.pick({id:true,slug:true,name:true,category:true,municipality:true,status:true}).extend({requestedPlan:planSchema,createdAt:z.string()});
export type CompanySummary = z.infer<typeof companySummarySchema>;
export const companyListSchema = z.object({items:z.array(companySummarySchema),hasMore:z.boolean()});
export const reviewDecisionSchema = z.object({decision:z.enum(['approve','reject']),note:z.string().trim().max(1000).default('')}).strict().refine(value=>value.decision!=='reject'||value.note.length>=5,{path:['note'],message:'Lisa tagasilükkamise põhjus (vähemalt 5 märki).'});


export const publicProfileInputSchema = z.object({
  image: z.string().max(200).optional(), logo: z.string().max(200).optional(),
  name: z.string().trim().min(2).max(200),
  brandName: z.string().trim().max(120),
  category: z.enum(categories),
  additionalCategories: z.array(z.enum(categories)).max(4),
  municipality: z.string().trim().min(2).max(100),
  settlement: z.string().trim().min(2).max(100),
  address: z.string().trim().max(200),
  email: z.string().trim().email().max(254), phone: phoneInput, website: websiteInput,
  employees: z.enum(employeeBands),
  tagline: z.string().trim().min(10).max(160),
  description: z.string().trim().min(30).max(3000),
}).strict().refine(value => !value.additionalCategories.includes(value.category) && new Set(value.additionalCategories).size === value.additionalCategories.length, {path: ['additionalCategories'], message: 'Kontrolli lisakategooriaid.'});
export type PublicProfileInput = z.infer<typeof publicProfileInputSchema>;
export const profileContactInputSchema = z.object({
  name: z.string().trim().min(2).max(100), role: z.string().trim().max(100),
  email: z.string().trim().email().max(254), phone: phoneInput,
}).strict();
export const profileSaveSchema = z.object({
  version: z.number().int().min(0),
  publicProfile: publicProfileInputSchema,
  contact: profileContactInputSchema,
}).strict();
export type ProfileSave = z.infer<typeof profileSaveSchema>;
export const profileRevisionSchema = z.object({
  id: z.string().uuid(), status: z.enum(['pending','approved','rejected','superseded']),
  content: publicProfileInputSchema, note: z.string(), createdAt: z.string(),
});
export const ownProfileSchema = z.object({
  company: privateCompanySchema, revision: profileRevisionSchema.nullable(), version: z.number().int(),
});
export type OwnProfile = z.infer<typeof ownProfileSchema>;
export function companyDisplayName(company: { name: string; brandName?: string }) {
  return company.brandName?.trim() || company.name;
}
