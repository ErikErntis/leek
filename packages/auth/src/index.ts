import type { Plan } from '@leek/contracts';
export type CompanyRole = 'owner' | 'editor';
export type Actor = { userId: string; platformRole: 'member' | 'admin'; memberships: { companyId: string; role: CompanyRole }[] };
export function canManageCompany(actor: Actor | null, companyId: string) {
 return actor !== null && (actor.platformRole === 'admin' || actor.memberships.some(m => m.companyId === companyId));
}
export function hasFeature(plan: Plan, feature: 'profile' | 'offers' | 'jobs', expiresAt: Date | null, now = new Date()) {
 const activePlan = plan !== 'free' && expiresAt !== null && expiresAt > now ? plan : 'free';
 return feature === 'profile' || (feature === 'offers' && activePlan !== 'free') || (feature === 'jobs' && activePlan === 'employer');
}
// Session verification will be wired with Better Auth in the next slice.
// No unverified client identity or demo actor may authorize a write.
