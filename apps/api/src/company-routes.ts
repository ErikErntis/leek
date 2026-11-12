import type { createProductListings } from './product-listings';
import { productActionSchema } from '@leek/contracts';
import type { createServiceListings } from './service-listings';
import { serviceSaveSchema } from '@leek/contracts';
import type { createProfileService } from './company-profile';
import { profileSaveSchema } from '@leek/contracts';
import { logError } from './log-error';
import type { createBilling } from './billing';
import { planSchema } from '@leek/contracts';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { companySubmissionSchema, reviewDecisionSchema } from '@leek/contracts';
import { CompanyError, type createCompanyService } from './company-service';
import type { AuthHandler } from './app';

export function companyRoutes(auth: AuthHandler | undefined, service: ReturnType<typeof createCompanyService> | undefined, origins: string[], billing?: ReturnType<typeof createBilling>, profiles?: ReturnType<typeof createProfileService>, listings?: ReturnType<typeof createServiceListings>, products?: ReturnType<typeof createProductListings>) {
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
    let body: unknown; try { body = await c.req.json(); } catch { return c.json({ error: 'Vigane päring.' }, 400); }
    const selected = (body as { plan?: unknown } | null)?.plan;
    if (selected !== undefined && !planSchema.safeParse(selected).success) return c.json({ error: 'Vali sobiv pakett.' }, 400);
    return c.json(await billing.checkout(c.get('userId'), c.req.param('id'), selected as import('@leek/contracts').Plan | undefined));
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
  routes.get('/v1/my/companies/:id/profile', async c => {
    if (!profiles) return c.json({error:'Profiil pole seadistatud.'},503);
    if (!validId(c.req.param('id'))) return c.json({error:'Ettevõtet ei leitud.'},404);
    return c.json(await profiles.own(c.get('userId'),c.req.param('id')));
  });
  routes.post('/v1/my/companies/:id/profile', async c => {
    if (!profiles) return c.json({error:'Profiil pole seadistatud.'},503);
    if (!validId(c.req.param('id'))) return c.json({error:'Ettevõtet ei leitud.'},404);
    let body: unknown; try {body=await c.req.json();} catch {return c.json({error:'Vigane JSON-päring.'},400);}
    const input=profileSaveSchema.safeParse(body);
    if (!input.success) return c.json({error:'Kontrolli profiili andmeid.',fields:input.error.flatten().fieldErrors},400);
    return c.json(await profiles.save(c.get('userId'),c.req.param('id'),input.data));
  });
  routes.get('/v1/admin/profile-revisions',async c=>{
    if (!profiles) return c.json({error:'Profiil pole seadistatud.'},503);
    return c.json(await profiles.queue());
  });
  routes.get('/v1/admin/profile-revisions/:id',async c=>{
    if (!profiles) return c.json({error:'Profiil pole seadistatud.'},503);
    if (!validId(c.req.param('id'))) return c.json({error:'Muudatust ei leitud.'},404);
    return c.json(await profiles.reviewDetail(c.req.param('id')));
  });
  routes.post('/v1/admin/profile-revisions/:id/review',async c=>{
    if (!profiles) return c.json({error:'Profiil pole seadistatud.'},503);
    if (!validId(c.req.param('id'))) return c.json({error:'Muudatust ei leitud.'},404);
    let body:unknown;try{body=await c.req.json();}catch{return c.json({error:'Vigane JSON-päring.'},400);}
    const input=reviewDecisionSchema.safeParse(body);
    if (!input.success) return c.json({error:'Lisa otsus ja tagasilükkamise põhjus.'},400);
    return c.json(await profiles.review(c.get('userId'),c.req.param('id'),input.data.decision,input.data.note));
  });
  routes.get('/v1/my/companies/:id/services', async c => {
    if (!listings) return c.json({ error: 'Teenused pole seadistatud.' }, 503);
    if (!validId(c.req.param('id'))) return c.json({ error: 'Ettevõtet ei leitud.' }, 404);
    return c.json({ items: await listings.own(c.get('userId'), c.req.param('id')) });
  });
  routes.post('/v1/my/companies/:id/services', async c => {
    if (!listings) return c.json({ error: 'Teenused pole seadistatud.' }, 503);
    if (!validId(c.req.param('id'))) return c.json({ error: 'Ettevõtet ei leitud.' }, 404);
    const input = serviceSaveSchema.safeParse(await c.req.json().catch(() => null));
    if (!input.success) return c.json({ error: 'Kontrolli teenuse andmeid.' }, 400);
    return c.json(await listings.save(c.get('userId'), c.req.param('id'), input.data));
  });
  routes.get('/v1/admin/services', async c => {
    if (!listings) return c.json({ error: 'Teenused pole seadistatud.' }, 503);
    return c.json({ items: await listings.queue() });
  });
  routes.post('/v1/admin/services/:id/review', async c => {
    if (!listings) return c.json({ error: 'Teenused pole seadistatud.' }, 503);
    if (!validId(c.req.param('id'))) return c.json({ error: 'Teenust ei leitud.' }, 404);
    const body = await c.req.json().catch(() => null);
    const decision = reviewDecisionSchema.safeParse({ decision: body?.decision, note: body?.note });
    const version = body?.version;
    if (!decision.success || !Number.isSafeInteger(version) || version < 0) return c.json({ error: 'Kontrolli otsust ja märkust.' }, 400);
    return c.json(await listings.review(c.req.param('id'), version, decision.data.decision, decision.data.note));
  });
  routes.get('/v1/my/companies/:id/products', async c => {
    if (!products) return c.json({ error: 'Tooted pole seadistatud.' }, 503);
    if (!validId(c.req.param('id'))) return c.notFound();
    return c.json(await products.own(c.get('userId'), c.req.param('id')));
  });
  routes.post('/v1/my/companies/:id/products', async c => {
    if (!products) return c.json({ error: 'Tooted pole seadistatud.' }, 503);
    const companyId = c.req.param('id');
    if (!validId(companyId)) return c.notFound();
    const parsed = productActionSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'Kontrolli sisestatud andmeid ja veebiaadresse.' }, 400);
    const userId = c.get('userId');
    const input = parsed.data;
    switch (input.action) {
      case 'catalog': return c.json(await products.catalog(userId, companyId, input.connection, input.cursor));
      case 'import': return c.json({ items: await products.import(userId, companyId, input.shopId, input.cursor, input.sourceIds, input.publish) });
      case 'publish-imported': return c.json({ items: await products.publishImported(userId, companyId, input.ids) });
      case 'help': await products.help(userId, companyId, input); return c.json({ ok: true });
      default: return c.json(await products.save(userId, companyId, input));
    }
  });
  routes.get('/v1/admin/products', async c => {
    if (!products) return c.json({ error: 'Tooted pole seadistatud.' }, 503);
    return c.json({ items: [], requests: await products.helpQueue() });
  });
  routes.post('/v1/admin/product-help/:id/resolve', async c => {
    if (!products) return c.json({ error: 'Tooted pole seadistatud.' }, 503);
    if (!validId(c.req.param('id'))) return c.notFound();
    await products.resolveHelp(c.req.param('id'));
    return c.json({ ok: true });
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
    logError('Company request failed', error);
    return c.json({ error: 'Andmeid ei saanud töödelda. Proovi uuesti.' }, 503);
  });
  return routes;
}
