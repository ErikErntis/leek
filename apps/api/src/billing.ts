import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq, desc } from 'drizzle-orm';
import { companies, memberships, billingCheckouts, type createDatabase } from '@leek/db';
import type { Plan } from '@leek/contracts';
import { CompanyError } from './company-service';
type Database = ReturnType<typeof createDatabase>['db'];
export const plans = [
  { id: 'free', name: 'Alustaja', amount: 0, features: ['Ettevõtte profiil', 'Üks teenus'] },
  { id: 'visibility', name: 'Edendaja', amount: 5000, features: ['Piiramatult teenuseid', 'Statistika'] },
  { id: 'employer', name: 'Eestvedaja', amount: 15000, features: ['Piiramatult teenuseid', 'Statistika', 'Töö- ja üritusekuulutused', 'Esiletõstmine'] },
] as const;
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
    return await response.json() as { id: string; url: string; status: string; payment_status: string; amount_total: number; currency: string; client_reference_id: string };
  }
  async function owner(tx: Database, userId: string, id: string) {
    const [membership] = await tx.select().from(memberships).where(and(eq(memberships.companyId, id), eq(memberships.userId, userId), eq(memberships.role, 'owner')));
    if (!membership) throw new CompanyError(404, 'Ettevõtet ei leitud.');
    const [company] = await tx.select().from(companies).where(eq(companies.id, id)).for('update');
    if (!company) throw new CompanyError(404, 'Ettevõtet ei leitud.');
    return company;
  }
  async function closePending(tx: Database, id: string) {
    const pending = await tx.select().from(billingCheckouts).where(and(eq(billingCheckouts.companyId, id), eq(billingCheckouts.status, 'pending')));
    for (const row of pending) {
      if (row.stripeSessionId) {
        const session = await stripe(`checkout/sessions/${row.stripeSessionId}`);
        if (session.status === 'complete') fail('Makse on töötlemisel. Värskenda lehte mõne hetke pärast.');
        if (session.status === 'open') await stripe(`checkout/sessions/${row.stripeSessionId}/expire`, new URLSearchParams());
      }
      await tx.update(billingCheckouts).set({ status: 'cancelled' }).where(eq(billingCheckouts.id, row.id));
    }
  }
  return {
    async overview(userId: string) {
      const rows = await db.select({ company: companies }).from(memberships).innerJoin(companies, eq(memberships.companyId, companies.id)).where(and(eq(memberships.userId, userId), eq(memberships.role, 'owner'))).orderBy(desc(companies.createdAt));
      const now = new Date();
      return { companies: rows.map(({ company }) => ({ id: company.id, name: company.name, slug: company.slug, status: company.status, reviewNote: company.reviewNote, requestedPlan: company.requestedPlan, plan: company.paidUntil && company.paidUntil > now ? company.plan : 'free', paidUntil: company.paidUntil?.toISOString() ?? null })), plans, checkoutAvailable: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.PORTAL_URL) };
    },
    async choose(userId: string, id: string, plan: Plan) {
      return db.transaction(async raw => {
        const tx = raw as unknown as Database;
        const company = await owner(tx, userId, id);
        if (company.status !== 'published') fail('Paketti saab muuta pärast ettevõtte kinnitamist.');
        if (company.paidUntil && company.paidUntil > new Date()) fail('Aktiivse tasulise paketi muutmiseks võta ühendust halduriga.');
        await closePending(tx, id);
        await tx.update(companies).set({ requestedPlan: plan, plan: 'free', featured: false, paidUntil: null, updatedAt: new Date() }).where(eq(companies.id, id));
        return { ok: true };
      });
    },
    async checkout(userId: string, id: string) {
      if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.PORTAL_URL) fail('Maksmine pole veel seadistatud. Saad jätkata tasuta paketiga.');
      return db.transaction(async raw => {
        const tx = raw as unknown as Database;
        const company = await owner(tx, userId, id);
        if (company.status !== 'published') fail('Maksta saab pärast ettevõtte kinnitamist.');
        if (company.paidUntil && company.paidUntil > new Date()) fail('Tasuline pakett on juba aktiivne.');
        const plan = plans.find(p => p.id === company.requestedPlan)!;
        if (plan.id === 'free') fail('Tasuta paketi eest ei ole vaja maksta.');
        const [existing] = await tx.select().from(billingCheckouts).where(and(eq(billingCheckouts.companyId, id), eq(billingCheckouts.status, 'pending')));
        if (existing?.stripeSessionId) {
          const session = await stripe(`checkout/sessions/${existing.stripeSessionId}`);
          if (session.status === 'open') return { url: session.url };
          if (session.status === 'complete') fail('Makse on töötlemisel. Värskenda lehte mõne hetke pärast.');
          await tx.update(billingCheckouts).set({ status: 'expired' }).where(eq(billingCheckouts.id, existing.id));
        }
        const [record] = await tx.insert(billingCheckouts).values({ companyId: id, plan: plan.id, amount: plan.amount }).returning();
        const portal = new URL(process.env.PORTAL_URL!).origin;
        const body = new URLSearchParams({ mode: 'payment', 'payment_method_types[0]': 'card', client_reference_id: record!.id, 'metadata[companyId]': id, 'metadata[plan]': plan.id, 'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': String(plan.amount), 'line_items[0][price_data][product_data][name]': `LEEK ${plan.name} – 1 aasta`, 'line_items[0][quantity]': '1', success_url: `${portal}/pakett?company=${id}&payment=success`, cancel_url: `${portal}/pakett?company=${id}&payment=cancelled` });
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
      if (record.amount !== session.amount_total || session.currency !== 'eur' || session.client_reference_id !== record.id) throw new Error('Checkout details mismatch');
      await db.transaction(async raw => {
        const tx = raw as unknown as Database;
        const [company] = await tx.select().from(companies).where(eq(companies.id, record.companyId)).for('update');
        const [current] = await tx.select().from(billingCheckouts).where(eq(billingCheckouts.id, record.id)).for('update');
        if (current!.status === 'paid') return;
        if (!company || company.status !== 'published') throw new Error('Paid company requires manual review');
        const now = new Date(); const until = new Date(Math.max(now.getTime(), company.paidUntil?.getTime() ?? 0)); until.setUTCFullYear(until.getUTCFullYear() + 1);
        await tx.update(billingCheckouts).set({ status: 'paid', paidAt: now }).where(eq(billingCheckouts.id, record.id));
        await tx.update(companies).set({ plan: record.plan, requestedPlan: record.plan, paidUntil: until, featured: record.plan === 'employer', updatedAt: now }).where(eq(companies.id, company.id));
      });
    },
  };
}
