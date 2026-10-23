import type { createBilling } from './billing';
import { planSchema } from '@leek/contracts';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { companySubmissionSchema, reviewDecisionSchema } from '@leek/contracts';
import { CompanyError, type createCompanyService } from './company-service';
import type { AuthHandler } from './app';

export function companyRoutes(auth: AuthHandler | undefined, service: ReturnType<typeof createCompanyService> | undefined, origins: string[], billing?: ReturnType<typeof createBilling>) {
  const routes = new Hono<{ Variables: { userId: string } }>();
  for (const path of ['/v1/my/*', '/v1/admin/*']) {
    routes.use(path, bodyLimit({ maxSize: 32768 }));
    routes.use(path, async (c, next) => {
      c.header('Cache-Control', 'no-store');
      if (!auth || !service) return c.json({ error: 'Teenus pole seadistatud.' }, 503);
      const session = await auth.api.getSession({ headers: c.req.raw.headers, query: { disableRefresh: true } });
      if (!session) return c.json({ error: 'Palun logi sisse.' }, 401);
      c.set('userId', session.user.id);
      if (c.req.method === 'POST') {
        if (!origins.includes(c.req.header('origin') ?? '')) return c.json({ error: 'Päringu päritolu pole lubatud.' }, 403);
        if (c.req.header('content-type')?.split(';')[0]?.trim() !== 'application/json') return c.json({ error: 'Ootame JSON-päringut.' }, 415);
      }
      await next();
    });
  }
  routes.use('/v1/admin/*', async (c, next) => {
    if (!await service!.isAdmin(c.get('userId'))) return c.json({ error: 'Sul puudub administraatori ligipääs.' }, 403);
    await next();
  });
  const validId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  routes.get('/v1/my/portal', async c => {
    if (!billing) return c.json({ error: 'Portaal pole seadistatud.' }, 503);
    return c.json(await billing.overview(c.get('userId')));
  });
  routes.post('/v1/my/companies/:id/plan', async c => {
    if (!billing) return c.json({ error: 'Portaal pole seadistatud.' }, 503);
    if (!validId(c.req.param('id'))) return c.json({ error: 'Ettevõtet ei leitud.' }, 404);
    let body: unknown; try { body = await c.req.json(); } catch { return c.json({ error: 'Vigane päring.' }, 400); }
    const parsed = planSchema.safeParse((body as { plan?: unknown } | null)?.plan);
    if (!parsed.success) return c.json({ error: 'Vali sobiv pakett.' }, 400);
    return c.json(await billing.choose(c.get('userId'), c.req.param('id'), parsed.data));
  });
  routes.post('/v1/my/companies/:id/checkout', async c => {
    if (!billing) return c.json({ error: 'Maksmine pole seadistatud.' }, 503);
    if (!validId(c.req.param('id'))) return c.json({ error: 'Ettevõtet ei leitud.' }, 404);
    return c.json(await billing.checkout(c.get('userId'), c.req.param('id')));
  });
  routes.post('/v1/my/companies', async c => {
    let body: unknown;
    try { body = await c.req.json(); } catch { return c.json({ error: 'Vigane JSON-päring.' }, 400); }
    const input = companySubmissionSchema.safeParse(body);
    if (!input.success) return c.json({ error: 'Kontrolli ettevõtte andmeid.', fields: input.error.flatten().fieldErrors }, 400);
    const result = await service!.submit(c.get('userId'), input.data);
    return c.json({ id: result.id }, result.created ? 201 : 200);
  });
  routes.get('/v1/my/companies/:id', async c => {
    if (!validId(c.req.param('id'))) return c.json({ error: 'Ettevõtet ei leitud.' }, 404);
    return c.json(await service!.ownDetail(c.get('userId'), c.req.param('id')));
  });
  routes.get('/v1/admin/access', c => c.json({ role: 'admin' }));
  routes.get('/v1/admin/companies', async c => {
    const status = c.req.query('status') ?? 'pending';
    const offset = Number(c.req.query('offset') ?? 0);
    if (!['pending','published','rejected','all'].includes(status) || !Number.isInteger(offset) || offset < 0 || offset > 100000) return c.json({ error: 'Vigane filter.' }, 400);
    return c.json(await service!.list(status as 'pending' | 'published' | 'rejected' | 'all', offset));
  });
  routes.get('/v1/admin/companies/:id', async c => {
    if (!validId(c.req.param('id'))) return c.json({ error: 'Ettevõtet ei leitud.' }, 404);
    return c.json(await service!.detail(c.req.param('id')));
  });
  routes.post('/v1/admin/companies/:id/review', async c => {
    if (!validId(c.req.param('id'))) return c.json({ error: 'Ettevõtet ei leitud.' }, 404);
    let body: unknown;
    try { body = await c.req.json(); } catch { return c.json({ error: 'Vigane JSON-päring.' }, 400); }
    const decision = reviewDecisionSchema.safeParse(body);
    if (!decision.success) return c.json({ error: 'Lisa korrektne otsus ja tagasilükkamise põhjus.' }, 400);
    return c.json(await service!.review(c.get('userId'), c.req.param('id'), decision.data.decision, decision.data.note));
  });
  routes.onError((error, c) => {
    if (error instanceof CompanyError) return c.json({ error: error.message }, error.status);
    console.error('Company request failed', error.name);
    return c.json({ error: 'Andmeid ei saanud töödelda. Proovi uuesti.' }, 503);
  });
  return routes;
}
