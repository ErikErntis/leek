import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { companySchema, publicProjection, directoryQuerySchema, filterCompanies, type PublicData } from '@leek/contracts';
export type Repository = { readPublic: () => Promise<PublicData>; check: () => Promise<void> };
export function createApp(repository: Repository, origins: string[] = []) {
 const app = new Hono();
 app.use('*',secureHeaders());
 app.use('*',cors({origin:origin=>origins.includes(origin)?origin:undefined,allowMethods:['GET','OPTIONS']}));
 app.get('/health',async c=>{try {await repository.check();return c.json({status:'ok'});}catch{return c.json({status:'unavailable'},503);}});
 app.get('/v1/public',async c=>c.json(publicProjection(await repository.readPublic())));
 app.get('/v1/companies',async c=>{const q=directoryQuerySchema.safeParse(c.req.query());if(!q.success)return c.json({error:'Vigased otsinguparameetrid'},400);const data=publicProjection(await repository.readPublic());return c.json({items:filterCompanies(data.companies,q.data),source:data.source});});
 app.get('/v1/companies/:slug',async c=>{const data=publicProjection(await repository.readPublic());const company=data.companies.find(x=>x.status==='published'&&x.slug===c.req.param('slug'));if(!company)return c.json({error:'Ettevõtet ei leitud'},404);return c.json({company:companySchema.parse(company),jobs:data.jobs.filter(j=>j.companyId===company.id),offers:data.offers.filter(o=>o.companyId===company.id),source:data.source});});
 app.onError((err,c)=>{console.error('API request failed',err.name);return c.json({error:'Teenuse ajutine tõrge'},503);});
 app.notFound(c=>c.json({error:'Ressurssi ei leitud'},404));
 return app;
}
