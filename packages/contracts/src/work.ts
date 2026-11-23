import { z } from 'zod';
import { municipalities } from './locations';

export const workKinds = { job: 'Tööpakkumine', gig: 'Tööamps' } as const;
export const workLoads = { full: 'Täistööaeg', part: 'Osaline tööaeg', flexible: 'Kokkuleppel' } as const;
export const workModes = { onsite: 'Kohapeal', hybrid: 'Hübriid', remote: 'Kaugtöö' } as const;
export const workPayUnits = { month: 'kuu', hour: 'tund', day: 'päev', task: 'kogu töö' } as const;
export const workStatuses = { draft: 'Mustand', pending: 'Ülevaatusel', returned: 'Vajab parandusi', published: 'Avaldatud', closed: 'Suletud', expired: 'Aegunud' } as const;
export const workCategories = ['Tootmine ja käsitöö', 'Ehitus ja remont', 'Teenindus ja müük', 'Transport ja logistika', 'Kontoritöö', 'Kodu ja aed', 'Muu'] as const;
const optionalDate = z.union([z.literal(''), z.iso.date()]);
const amount = z.number().int().min(0).max(100_000_000).nullable();
export const workContentSchema = z.object({
 kind: z.enum(['job', 'gig']),
 title: z.string().trim().max(120),
 category: z.enum(workCategories),
 municipality: z.union([z.literal(''), z.enum(municipalities)]),
 address: z.string().trim().max(250),
 mode: z.enum(['onsite', 'hybrid', 'remote']),
 load: z.enum(['full', 'part', 'flexible']),
 description: z.string().trim().max(4000),
 requirements: z.string().trim().max(2000),
 benefits: z.string().trim().max(2000),
 payMinCents: amount,
 payMaxCents: amount,
 payUnit: z.enum(['month', 'hour', 'day', 'task']),
 deadline: optionalDate,
 startsOn: optionalDate,
 endsOn: optionalDate,
 duration: z.string().trim().max(160),
 people: z.number().int().min(1).max(1000),
 contactMethod: z.enum(['email', 'url', 'portal']),
 contactEmail: z.string().trim().max(254),
 contactUrl: z.string().trim().max(2048),
}).strict().superRefine((content, ctx) => {
 if (content.payMinCents !== null && content.payMaxCents !== null && content.payMinCents > content.payMaxCents) {
  ctx.addIssue({ code: 'custom', path: ['payMaxCents'], message: 'Ülemine tasu peab olema vähemalt sama suur kui alumine.' });
 }
 if (content.startsOn && content.endsOn && content.startsOn > content.endsOn) {
  ctx.addIssue({ code: 'custom', path: ['endsOn'], message: 'Töö lõpp ei saa olla algusest varasem.' });
 }
 if (content.kind === 'job' && !['month', 'hour'].includes(content.payUnit) ||
     content.kind === 'gig' && !['hour', 'day', 'task'].includes(content.payUnit)) {
  ctx.addIssue({ code: 'custom', path: ['payUnit'], message: 'Vali selle kuulutuseliigi jaoks sobiv tasu alus.' });
 }
});
export type WorkContent = z.infer<typeof workContentSchema>;

// Date-only deadlines use the end of the selected day in Estonia, including summer time.
export function workDeadline(date: string): Date {
 const [year, month, day] = date.split('-').map(Number) as [number, number, number];
 const noon = new Date(Date.UTC(year, month - 1, day, 12));
 const zone = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Tallinn', timeZoneName: 'longOffset' })
  .formatToParts(noon).find(part => part.type === 'timeZoneName')!.value;
 const match = /GMT([+-])(\d{2}):(\d{2})/.exec(zone)!;
 const minutes = (Number(match[2]) * 60 + Number(match[3])) * (match[1] === '+' ? 1 : -1);
 return new Date(Date.UTC(year, month - 1, day + 1) - minutes * 60_000 - 1);
}
export function workToday(now = new Date()) {
 const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Tallinn', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
 const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value;
 return `${part('year')}-${part('month')}-${part('day')}`;
}
export const workSubmitSchema = workContentSchema.superRefine((content, ctx) => {
 const require = (field: keyof WorkContent, valid: boolean, message: string) => {
  if (!valid) ctx.addIssue({ code: 'custom', path: [field], message });
 };
 require('title', content.title.length >= 3, 'Lisa vähemalt kolmetäheline ametinimetus või töö pealkiri.');
 require('description', content.description.length >= 20, 'Kirjelda tööd vähemalt 20 tähemärgiga.');
 require('municipality', content.mode === 'remote' || Boolean(content.municipality), 'Vali töö asukoht.');
 require('deadline', Boolean(content.deadline) && workDeadline(content.deadline).getTime() > Date.now(), 'Vali kehtiv vastamise tähtaeg.');
 if (content.kind === 'gig') {
  require('startsOn', Boolean(content.startsOn) && content.startsOn >= workToday(), 'Vali tööampsu alguskuupäev.');
  require('deadline', !content.startsOn || content.deadline <= content.startsOn, 'Vastamise tähtaeg peab olema hiljemalt tööampsu alguspäeval.');
 }
 if (content.contactMethod === 'email') {
  require('contactEmail', z.email().safeParse(content.contactEmail).success, 'Sisesta korrektne e-posti aadress.');
 }
 if (content.contactMethod === 'url') {
  let valid = false;
  try {
   const url = new URL(content.contactUrl);
   valid = url.protocol === 'https:' && Boolean(url.hostname.includes('.')) && !url.username && !url.password;
  } catch { /* Report the field error below. */ }
  require('contactUrl', valid, 'Sisesta HTTPS-kandideerimislink.');
 }
});
const baseAction = { id: z.string().uuid(), version: z.number().int().min(0).nullable() };
export const workActionSchema = z.discriminatedUnion('action', [
 z.object({ ...baseAction, action: z.literal('draft'), content: workContentSchema }).strict(),
 z.object({ ...baseAction, action: z.literal('submit'), content: workContentSchema }).strict(),
 z.object({ ...baseAction, action: z.literal('close') }).strict(),
 z.object({ ...baseAction, action: z.literal('withdraw') }).strict(),
]);
export type WorkAction = z.infer<typeof workActionSchema>;
export type CompanyWork = {
 id: string; version: number; content: WorkContent; note: string; updatedAt: string;
 status: keyof typeof workStatuses; published: boolean;
};
export type OwnWork = { items: CompanyWork[]; canManage: boolean };
export function canManageWork(company: { status: string; currentSubscription: number | null; paidUntil: string | Date | null }, now = Date.now()) {
 return company.status === 'published' && company.currentSubscription === 3 &&
  Boolean(company.paidUntil && new Date(company.paidUntil).getTime() > now);
}
export function workPayLabel(content: Pick<WorkContent, 'payMinCents' | 'payMaxCents' | 'payUnit'>) {
 const money = (cents: number) => new Intl.NumberFormat('et-EE', { maximumFractionDigits: 2 }).format(cents / 100);
 const { payMinCents: min, payMaxCents: max, payUnit } = content;
 if (min === null && max === null) return 'Tasu kokkuleppel';
 const range = min !== null && max !== null ? min === max ? money(min) : `${money(min)}–${money(max)}` :
  min !== null ? `Alates ${money(min)}` : `Kuni ${money(max!)}`;
 return `${range} € / ${workPayUnits[payUnit]} bruto`;
}
export function blankWork(kind: WorkContent['kind'], email = ''): WorkContent {
 return {
  kind, title: '', category: 'Muu', municipality: '', address: '', mode: 'onsite', load: 'full',
  description: '', requirements: '', benefits: '', payMinCents: null, payMaxCents: null,
  payUnit: kind === 'job' ? 'month' : 'task', deadline: '', startsOn: '', endsOn: '', duration: '',
  people: 1, contactMethod: 'email', contactEmail: email, contactUrl: '',
 };
}
