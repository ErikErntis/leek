import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@leek/db/schema';
import { createAuth } from '@leek/auth/server';
import { createCompanyService } from './company-service';
import { createApp } from './app';
import type { PublicData } from '@leek/contracts';

test('company submission and admin review enforce ownership, privacy, status, quota and paid-plan boundaries', async () => {
  const client = new PGlite();
  try {
    for (const name of ['0000_stormy_paibok.sql','0001_flaky_nebula.sql','0002_moaning_zarda.sql']) await client.exec(await readFile(new URL(`../../../packages/db/migrations/${name}`, import.meta.url),'utf8'));
    const db = drizzle(client, { schema }) as unknown as Parameters<typeof createAuth>[0];
    const auth = createAuth(db, { publicURL:'https://leek.test', adminURL:'https://admin.leek.test', secret:'local-tests-only-long-random-secret-not-for-deployment' });
    const repository = { check:async()=>{}, readPublic:async():Promise<PublicData>=>({ companies:await db.select().from(schema.companies), jobs:[], offers:[], source:'database' }) };
    const app = createApp(repository,['https://leek.test','https://admin.leek.test'],auth,createCompanyService(db));
    async function request(path:string, body?:unknown, cookie?:string, origin='https://leek.test') {
      return app.request(`https://leek.test${path}`,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    }
    async function signup(email:string) {
      const response = await request('/api/auth/sign-up/email',{name:'Test Kasutaja',email,password:'Test-password-42'});
      assert.equal(response.status,200,await response.clone().text());
      return response.headers.getSetCookie().find(value=>value.startsWith('__Secure-leek.session_token='))!.split(';')[0]!;
    }
    const owner = await signup('owner@example.ee');
    const outsider = await signup('outsider@example.ee');
    const admin = await signup('admin@example.ee');
    const input = { name:'Katse Ettevõte OÜ',registrationCode:'12345678',category:'Tootmine',additionalCategories:['Jaemüük'],municipality:'Harku vald',settlement:'Tabasalu',address:'',email:'public@example.ee',phone:'',website:'',contactName:'Privaatne Kontakt',contactRole:'Esindaja',contactEmail:'private@example.ee',contactPhone:'+372 55555555',employees:'2–9',tagline:'Valmistame kohalikku mööblit.',description:'Meie ettevõte valmistab puidust mööblit kohalikele kodudele ja ettevõtetele.',regionConfirmed:true,requestedPlan:'employer' };
    assert.equal((await request('/v1/my/companies',input)).status,401);
    assert.equal((await request('/v1/my/companies',input,'__Secure-leek.session_token=forged')).status,401);
    assert.equal((await request('/v1/my/companies',input,owner,'https://evil.test')).status,403);
    assert.equal((await request('/v1/my/companies',{...input,status:'published',plan:'employer',featured:true},owner)).status,400);
    assert.equal((await request('/v1/my/companies',{...input,contactEmail:'bad'},owner)).status,400);
    assert.equal((await client.query('SELECT * FROM companies')).rows.length,0);
    const created = await request('/v1/my/companies',input,owner);
    assert.equal(created.status,201,await created.clone().text());
    const { id } = await created.json();
    assert.equal((await client.query('SELECT * FROM company_contacts')).rows.length,1);
    assert.equal((await client.query('SELECT * FROM company_memberships')).rows.length,1);
    const own = await (await request(`/v1/my/companies/${id}`,undefined,owner)).json();
    assert.equal(own.status,'pending');assert.equal(own.plan,'free');assert.equal(own.featured,false);assert.equal(own.requestedPlan,'employer');assert.equal(own.contact.email,'private@example.ee');
    assert.equal((await request(`/v1/my/companies/${id}`,undefined,outsider)).status,404);
    const retry = await request('/v1/my/companies',input,owner);assert.equal(retry.status,200);assert.equal((await retry.json()).id,id);
    assert.equal((await request('/v1/my/companies',input,outsider)).status,409);
    assert.equal((await (await request('/v1/public')).json()).companies.length,0);
    assert.equal((await request('/v1/admin/access',undefined,owner)).status,403);
    assert.equal((await request(`/v1/admin/companies/${id}/review`,{decision:'approve'},owner)).status,403);
    await client.query("UPDATE users SET role='admin' WHERE email='admin@example.ee'");
    assert.equal((await request('/v1/admin/access',undefined,admin)).status,200);
    const list = await (await request('/v1/admin/companies',undefined,admin)).json();assert.equal(list.items.length,1);assert.equal(list.items[0].id,id);assert.equal(list.items[0].contact,undefined);
    const detail = await (await request(`/v1/admin/companies/${id}`,undefined,admin)).json();assert.equal(detail.contact.name,'Privaatne Kontakt');
    assert.equal((await request(`/v1/admin/companies/${id}/review`,{decision:'reject',note:''},admin,'https://admin.leek.test')).status,400);
    const decisions = await Promise.all([
      request(`/v1/admin/companies/${id}/review`,{decision:'approve',note:'Andmed kontrollitud.'},admin,'https://admin.leek.test'),
      request(`/v1/admin/companies/${id}/review`,{decision:'approve',note:'Teine otsus korraga.'},admin,'https://admin.leek.test'),
    ]);
    assert.deepEqual(decisions.map(x=>x.status).sort(),[200,409]);
    const reviewed = await (await request(`/v1/my/companies/${id}`,undefined,owner)).json();assert.equal(reviewed.status,'published');assert.equal(reviewed.plan,'free');
    const published = await (await request('/v1/public')).json();assert.equal(published.companies.length,1);assert.equal(published.companies[0].contact,undefined);assert.equal(published.companies[0].reviewNote,undefined);assert.doesNotMatch(JSON.stringify(published),/private@example.ee|Privaatne Kontakt|submittedBy|reviewedBy/);
    const audit = await client.query<{reviewed_by:string;reviewed_at:string}>('SELECT reviewed_by,reviewed_at FROM companies WHERE id=$1',[id]);assert.ok(audit.rows[0]!.reviewed_by);assert.ok(audit.rows[0]!.reviewed_at);
    // Rejection stays private and retains its reason for the owner.
    const another = await request('/v1/my/companies',{...input,registrationCode:'12345679'},owner);const rejectedId=(await another.json()).id;
    assert.equal((await request(`/v1/admin/companies/${rejectedId}/review`,{decision:'reject',note:'Piirkond vajab täpsustamist.'},admin,'https://admin.leek.test')).status,200);
    assert.equal((await (await request(`/v1/my/companies/${rejectedId}`,undefined,owner)).json()).reviewNote,'Piirkond vajab täpsustamist.');
    assert.equal((await (await request('/v1/public')).json()).companies.length,1);
    for(let n=0;n<3;n++)assert.equal((await request('/v1/my/companies',{...input,registrationCode:`2234567${n}`},owner)).status,201);
    assert.equal((await request('/v1/my/companies',{...input,registrationCode:'32345678'},owner)).status,429);
    assert.equal((await client.query('SELECT * FROM companies')).rows.length,5);
    await client.query("UPDATE users SET role='member' WHERE email='admin@example.ee'");
    assert.equal((await request('/v1/admin/companies',undefined,admin)).status,403);
  } finally { await client.close(); }
});
