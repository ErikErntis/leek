import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq, desc, inArray, lte } from 'drizzle-orm';
import { companies, memberships, billingCheckouts, type createDatabase } from '@leek/db';
import type { Plan } from '@leek/contracts';
import { CompanyError } from './company-service';
import { logError } from './log-error';
type Checkout = typeof billingCheckouts.$inferSelect;
type PaidSession = { id: string; payment_status?: string; amount_total?: number; currency?: string; client_reference_id?: string };
type Database = ReturnType<typeof createDatabase>['db'];
export const plans = [
  { id: 'free', name: 'Alustaja', amount: 0, features: ['Ettevõtte profiil', 'Üks teenus'] },
  { id: 'visibility', name: 'Edendaja', amount: 5000, features: ['Piiramatult teenuseid', 'Statistika'] },
  { id: 'employer', name: 'Eestvedaja', amount: 15000, features: ['Piiramatult teenuseid', 'Statistika', 'Töö- ja üritusekuulutused', 'Esiletõstmine'] },
] as const;
export const subscriptionId = (plan: Plan): 1 | 2 | 3 => plan === 'visibility' ? 2 : plan === 'employer' ? 3 : 1;
export const subscriptionPlan = (id: number | null): Plan => id === 2 ? 'visibility' : id === 3 ? 'employer' : 'free';
const fail = (message: string): never => { throw new CompanyError(409, message); };
export function verifyStripeSignature(raw: string, signature: string, secret: string, now = Date.now()) {
  const fields = signature.split(',').map(x => x.split('='));
  const timestamp = fields.find(x => x[0] === 't')?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest();
  return fields.filter(x => x[0] === 'v1').some(x => /^[a-f0-9]{64}$/i.test(x[1] ?? '') && timingSafeEqual(expected, Buffer.from(x[1]!, 'hex')));
}
export function createBilling(db: Database, transport: typeof fetch = fetch) {
  async function stripe(path: string, body?: URLSearchParams, key?: string) {
    if (!process.env.STRIPE_SECRET_KEY) fail('Maksmine pole veel seadistatud. Saad jätkata tasuta paketiga.');
    const response = await transport(`https://api.stripe.com/v1/${path}`, {
      method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
      body, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Stripe request failed: ${response.status}`);
    return await response.json() as { id: string; url: string; status: string; payment_status: string; amount_total: number; currency: string; client_reference_id: string; success_url?: string };
  }
  async function owner(tx: Database, userId: string, id: string) {
    const [membership] = await tx.select().from(memberships).where(and(eq(memberships.companyId, id), eq(memberships.userId, userId), eq(memberships.role, 'owner')));
    if (!membership) throw new CompanyError(404, 'Ettevõtet ei leitud.');
    const [company] = await tx.select().from(companies).where(eq(companies.id, id)).for('update');
    if (!company) throw new CompanyError(404, 'Ettevõtet ei leitud.');
    return company;
  }
  // Both the signed webhook and authenticated portal recovery use the same
  // transaction. Lock company first everywhere so concurrent deliveries cannot
  // activate a payment twice or extend the subscription twice.
  async function activate(tx: Database, record: Checkout, session: PaidSession) {
    if (session.payment_status !== 'paid') return false;
    if (record.stripeSessionId !== session.id || record.amount !== session.amount_total || session.currency !== 'eur' || session.client_reference_id !== record.id) throw new Error('Checkout details mismatch');
    const [company] = await tx.select().from(companies).where(eq(companies.id, record.companyId)).for('update');
    const [current] = await tx.select().from(billingCheckouts).where(eq(billingCheckouts.id, record.id)).for('update');
    if (!current) throw new Error('Unknown checkout');
    if (current.status === 'paid') return true;
    if (!company || company.status !== 'published') throw new Error('Paid company requires manual review');
    const now = new Date();
    const until = new Date(Math.max(now.getTime(), company.paidUntil?.getTime() ?? 0));
    until.setUTCFullYear(until.getUTCFullYear() + 1);
    await tx.update(billingCheckouts).set({ status: 'paid', paidAt: now }).where(eq(billingCheckouts.id, record.id));
    await tx.update(companies).set({ currentSubscription: subscriptionId(record.plan), plan: record.plan, requestedPlan: record.plan, paidUntil: until, featured: record.plan === 'employer', updatedAt: now }).where(eq(companies.id, company.id));
    return true;
  }
  const successURL = (id: string) => `${new URL(process.env.BETTER_AUTH_URL!).origin}/portaal/pakett?company=${id}&payment=success`;
  async function closePending(tx: Database, id: string) {
    const pending = await tx.select().from(billingCheckouts).where(and(eq(billingCheckouts.companyId, id), eq(billingCheckouts.status, 'pending')));
    for (const row of pending) {
      if (row.stripeSessionId) {
        const session = await stripe(`checkout/sessions/${row.stripeSessionId}`);
        if (await activate(tx, row, session)) return true;
        if (session.status === 'complete') fail('Makse on töötlemisel. Värskenda lehte mõne hetke pärast.');
        if (session.status === 'open') await stripe(`checkout/sessions/${row.stripeSessionId}/expire`, new URLSearchParams());
      }
      await tx.update(billingCheckouts).set({ status: 'cancelled' }).where(eq(billingCheckouts.id, row.id));
    }
    return false;
  }
  return {
    async overview(userId: string) {
      let rows = await db.select({ company: companies }).from(memberships).innerJoin(companies, eq(memberships.companyId, companies.id)).where(and(eq(memberships.userId, userId), eq(memberships.role, 'owner'))).orderBy(desc(companies.createdAt));
      const failedChecks = new Set<string>();
      if (rows.length && process.env.STRIPE_SECRET_KEY) {
        // Only sessions belonging to this user's companies can be reconciled.
        // This also recovers older payments without a return URL/session query.
        const pending = await db.select().from(billingCheckouts).where(and(inArray(billingCheckouts.companyId, rows.map(({ company }) => company.id)), eq(billingCheckouts.status, 'pending')));
        await Promise.all(pending.filter(record => record.stripeSessionId).map(async record => {
          try {
            const session = await stripe(`checkout/sessions/${record.stripeSessionId}`);
            if (session.payment_status === 'paid') {
              await db.transaction(raw => activate(raw as unknown as Database, record, session));
            } else if (session.status === 'expired') {
              await db.update(billingCheckouts).set({ status: 'expired' }).where(and(eq(billingCheckouts.id, record.id), eq(billingCheckouts.status, 'pending')));
            }
          } catch (error) {
            failedChecks.add(record.companyId);
            logError('Billing payment reconciliation failed', error);
          }
        }));
        if (pending.length) rows = await db.select({ company: companies }).from(memberships).innerJoin(companies, eq(memberships.companyId, companies.id)).where(and(eq(memberships.userId, userId), eq(memberships.role, 'owner'))).orderBy(desc(companies.createdAt));
      }
      const now = new Date();
      const expired = rows.filter(({ company }) => company.currentSubscription !== null && company.currentSubscription > 1 && company.paidUntil !== null && company.paidUntil <= now);
      if (expired.length) {
        await db.update(companies).set({ currentSubscription: 1, plan: 'free', featured: false, updatedAt: now }).where(and(inArray(companies.id, expired.map(({ company }) => company.id)), inArray(companies.currentSubscription, [2, 3]), lte(companies.paidUntil, now)));
        for (const { company } of expired) company.currentSubscription = 1;
      }
      return { companies: rows.map(({ company }) => ({ id: company.id, paymentCheckFailed: failedChecks.has(company.id), name: company.name, slug: company.slug, status: company.status, reviewNote: company.reviewNote, requestedPlan: company.requestedPlan, preferredSubscription: company.preferredSubscription, currentSubscription: company.currentSubscription, plan: company.currentSubscription !== null && company.paidUntil && company.paidUntil > now ? subscriptionPlan(company.currentSubscription) : 'free', paidUntil: company.paidUntil?.toISOString() ?? null })), plans, checkoutAvailable: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.BETTER_AUTH_URL) };
    },
    async choose(userId: string, id: string, plan: Plan) {
      return db.transaction(async raw => {
        const tx = raw as unknown as Database;
        const company = await owner(tx, userId, id);
        if (company.status !== 'published') fail('Paketti saab muuta pärast ettevõtte kinnitamist.');
        if (company.paidUntil && company.paidUntil > new Date()) {
          if (plan === company.plan) return { ok: true, activated: true };
          fail('Aktiivse tasulise paketi muutmiseks võta ühendust halduriga.');
        }
        if (plan !== 'free' && company.requestedPlan === plan) return { ok: true };
        if (await closePending(tx, id)) return { ok: true, activated: true };
        await tx.update(companies).set({ requestedPlan: plan, ...(plan === 'free' ? { currentSubscription: 1 } : {}), plan: 'free', featured: false, paidUntil: null, updatedAt: new Date() }).where(eq(companies.id, id));
        return { ok: true };
      });
    },
    async checkout(userId: string, id: string, expectedPlan?: Plan) {
      if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.BETTER_AUTH_URL) fail('Maksmine pole veel seadistatud. Saad jätkata tasuta paketiga.');
      return db.transaction(async raw => {
        const tx = raw as unknown as Database;
        const company = await owner(tx, userId, id);
        if (company.status !== 'published') fail('Maksta saab pärast ettevõtte kinnitamist.');
        if (company.paidUntil && company.paidUntil > new Date()) return { activated: true, url: successURL(id) };
        if (expectedPlan && company.requestedPlan !== expectedPlan) fail('Paketivalik on vahepeal muutunud. Vali pakett uuesti.');
        const plan = plans.find(p => p.id === company.requestedPlan)!;
        if (plan.id === 'free') fail('Tasuta paketi eest ei ole vaja maksta.');
        const [existing] = await tx.select().from(billingCheckouts).where(and(eq(billingCheckouts.companyId, id), eq(billingCheckouts.status, 'pending')));
        if (existing?.stripeSessionId) {
          const session = await stripe(`checkout/sessions/${existing.stripeSessionId}`);
          if (await activate(tx, existing, session)) return { activated: true, url: successURL(id) };
          if (session.status === 'open') {
            const expectedReturn = successURL(id);
            if (session.success_url === expectedReturn) return { url: session.url };
            // A Checkout created before the portal move still points at the retired domain.
            await stripe(`checkout/sessions/${existing.stripeSessionId}/expire`, new URLSearchParams());
          }
          if (session.status === 'complete') fail('Makse on töötlemisel. Värskenda lehte mõne hetke pärast.');
          await tx.update(billingCheckouts).set({ status: 'expired' }).where(eq(billingCheckouts.id, existing.id));
        }
        const [record] = await tx.insert(billingCheckouts).values({ companyId: id, plan: plan.id, amount: plan.amount }).returning();
        const portal = new URL(process.env.BETTER_AUTH_URL!).origin;
        const body = new URLSearchParams({ mode: 'payment', 'payment_method_types[0]': 'card', client_reference_id: record!.id, 'metadata[companyId]': id, 'metadata[plan]': plan.id, 'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': String(plan.amount), 'line_items[0][price_data][product_data][name]': `LEEK ${plan.name} – 1 aasta`, 'line_items[0][quantity]': '1', success_url: `${portal}/portaal/pakett?company=${id}&payment=success`, cancel_url: `${portal}/portaal/pakett?company=${id}&payment=cancelled` });
        const session = await stripe('checkout/sessions', body, record!.id);
        await tx.update(billingCheckouts).set({ stripeSessionId: session.id }).where(eq(billingCheckouts.id, record!.id));
        return { url: session.url };
      });
    },
    async webhook(event: { type: string; data: { object: { id: string; payment_status?: string; amount_total?: number; currency?: string; client_reference_id?: string } } }) {
      if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return;
      const session = event.data.object;
      if (session.payment_status !== 'paid') return;
      const [record] = await db.select().from(billingCheckouts).where(eq(billingCheckouts.stripeSessionId, session.id));
      if (!record) throw new Error('Unknown checkout; retry after transaction commits');
      await db.transaction(raw => activate(raw as unknown as Database, record, session));
    },
  };
}
