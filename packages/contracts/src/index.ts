import { z } from 'zod';
export const planSchema = z.enum(['free', 'visibility', 'employer']);
export type Plan = z.infer<typeof planSchema>;
export const companySchema = z.object({
  id: z.string().uuid(), slug: z.string(), name: z.string(), registrationCode: z.string(),
  category: z.string(), municipality: z.string(), tagline: z.string(), description: z.string(),
  email: z.string().email(), phone: z.string(), website: z.string().url(), address: z.string(),
  image: z.string(), services: z.array(z.string()), plan: planSchema,
  status: z.enum(['draft', 'pending', 'published', 'rejected']), featured: z.boolean(),
});
export type Company = z.infer<typeof companySchema>;
export const jobSchema = z.object({ id: z.string().uuid(), slug: z.string(), companyId: z.string().uuid(), title: z.string(), municipality: z.string(), type: z.string(), description: z.string(), expiresAt: z.string().datetime(), status: z.enum(['draft', 'pending', 'published', 'closed']) });
export type Job = z.infer<typeof jobSchema>;
export const offerSchema = z.object({ id: z.string().uuid(), companyId: z.string().uuid(), title: z.string(), description: z.string(), expiresAt: z.string().datetime(), status: z.enum(['draft', 'pending', 'published', 'closed']) });
export type Offer = z.infer<typeof offerSchema>;
export const directoryQuerySchema = z.object({ q: z.string().trim().max(120).default(''), category: z.string().max(80).default(''), municipality: z.string().max(80).default('') });
export const categories = ['Ehitus', 'Toit ja majutus', 'Teenused', 'Tootmine', 'Kaubandus'] as const;
export const municipalities = ['Lääne-Harju vald', 'Lääne-Nigula vald', 'Keila linn', 'Haapsalu linn', 'Harku vald'] as const;
export const planNames: Record<Plan, string> = { free: 'Tasuta', visibility: 'Nähtavus', employer: 'Tööandja' };
export type PublicData = { companies: Company[]; jobs: Job[]; offers: Offer[]; source: 'demo' | 'database' };
export function filterCompanies(companies: Company[], query: z.infer<typeof directoryQuerySchema>) {
  const q = query.q.toLocaleLowerCase('et');
  return companies.filter(c => c.status === 'published' && (!query.category || c.category === query.category) && (!query.municipality || c.municipality === query.municipality) && (!q || [c.name, c.tagline, c.description, ...c.services].join(' ').toLocaleLowerCase('et').includes(q)));
}

export const publicDataSchema = z.object({companies:z.array(companySchema),jobs:z.array(jobSchema),offers:z.array(offerSchema),source:z.enum(['demo','database'])});
export function publicProjection(data:PublicData, now=Date.now()):PublicData {
 const companies=data.companies.filter(c=>c.status==='published');
 const ids=new Set(companies.map(c=>c.id));
 const active=(x:{companyId:string;status:string;expiresAt:string})=>ids.has(x.companyId)&&x.status==='published'&&Date.parse(x.expiresAt)>now;
 return publicDataSchema.parse({companies,jobs:data.jobs.filter(active),offers:data.offers.filter(active),source:data.source});
}
