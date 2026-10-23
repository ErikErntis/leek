import { logError } from './log-error';
import { verifyStripeSignature, type createBilling } from './billing';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { companySchema, publicProjection, directoryQuerySchema, filterCompanies, type PublicData } from '@leek/contracts';
export type Repository = { readPublic: () => Promise<PublicData>; check: () => Promise<void> };
import type { createAuth } from '@leek/auth/server';
import { companyRoutes } from './company-routes';
import type { createCompanyService } from './company-service';
export type AuthHandler = Pick<ReturnType<typeof createAuth>, 'handler' | 'api'>;
export function createApp(repository: Repository, origins: string[] = [], auth?: AuthHandler, companyService?: ReturnType<typeof createCompanyService>, billing?: ReturnType<typeof createBilling>) {
 const app = new Hono();
 app.use('*',secureHeaders());
 app.use('/api/auth/*', bodyLimit({ maxSize: 16384, onError: c => c.json({ error: 'Liiga suur päring' }, 413) }));
 // Auth is consumed through the web's same-origin proxy. Do not enable CORS on it.
 app.on(['GET','POST'], '/api/auth/*', async c => {
  const routes: Record<string,string> = { '/api/auth/sign-up/email': 'POST', '/api/auth/sign-in/email': 'POST', '/api/auth/sign-out': 'POST', '/api/auth/get-session': 'GET' };
  if (routes[new URL(c.req.url).pathname] !== c.req.method) return c.json({ error: 'Ressurssi ei leitud' }, 404);
  if (!auth) return c.json({ error: 'Autentimine pole seadistatud' }, 503);
  const headers = new Headers(c.req.raw.headers);
  // Conservative shared bucket until an edge-verified client IP is wired.
  // A supplied X-Forwarded-For/X-Leek-Auth-IP cannot bypass the limiter.
  headers.set('x-leek-auth-ip', '127.0.0.1');
  return auth.handler(new Request(c.req.raw, { headers }));
 });
 app.post('/v1/stripe/webhook', bodyLimit({ maxSize: 262144 }), async c => {
  if (!billing || !process.env.STRIPE_WEBHOOK_SECRET) return c.json({error:'Payments unavailable'},503);
  const raw = await c.req.text();
  if (!verifyStripeSignature(raw,c.req.header('stripe-signature')??'',process.env.STRIPE_WEBHOOK_SECRET)) return c.json({error:'Invalid signature'},400);
  let event; try { event=JSON.parse(raw); } catch { return c.json({error:'Invalid JSON'},400); }
  if (!event || typeof event.type!=='string' || typeof event.data?.object?.id!=='string') return c.json({error:'Invalid event'},400);
  await billing.webhook(event);
  return c.json({received:true});
 });
 app.use('*',cors({origin:origin=>origins.includes(origin)?origin:undefined,allowMethods:['GET','OPTIONS']}));
 app.route('/', companyRoutes(auth, companyService, origins, billing));
 app.get('/health',async c=>{try {await repository.check();return c.json({status:'ok'});}catch{return c.json({status:'unavailable'},503);}});
 app.get('/v1/public',async c=>c.json(publicProjection(await repository.readPublic())));
 app.get('/v1/companies',async c=>{const q=directoryQuerySchema.safeParse(c.req.query());if(!q.success)return c.json({error:'Vigased otsinguparameetrid'},400);const data=publicProjection(await repository.readPublic());return c.json({items:filterCompanies(data.companies,q.data),source:data.source});});
 app.get('/v1/companies/:slug',async c=>{const data=publicProjection(await repository.readPublic());const company=data.companies.find(x=>x.status==='published'&&x.slug===c.req.param('slug'));if(!company)return c.json({error:'Ettevõtet ei leitud'},404);return c.json({company:companySchema.parse(company),jobs:data.jobs.filter(j=>j.companyId===company.id),offers:data.offers.filter(o=>o.companyId===company.id),source:data.source});});
 app.onError((err,c)=>{logError('API request failed', err);return c.json({error:'Teenuse ajutine tõrge'},503);});
 app.notFound(c=>c.json({error:'Ressurssi ei leitud'},404));
 return app;
}
