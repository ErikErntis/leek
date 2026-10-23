import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {drizzle} from 'drizzle-orm/pglite';
import * as schema from '@leek/db/schema';
import {createBilling,verifyStripeSignature} from './billing';
import {createPortalTransfer} from './portal-transfer';
import {billingMigration} from '../../../packages/db/src/migrate-billing';

test('package ownership, approval, checkout reuse, verified payment, replay, free switch and SSO expiry',async()=>{
 const client=new PGlite();
 const original={key:process.env.STRIPE_SECRET_KEY,secret:process.env.STRIPE_WEBHOOK_SECRET,portal:process.env.BETTER_AUTH_URL};
 process.env.STRIPE_SECRET_KEY='sk_test_local';process.env.STRIPE_WEBHOOK_SECRET='whsec_test';process.env.BETTER_AUTH_URL='https://web.test';
 try{
  for(const name of ['0000_stormy_paibok.sql','0001_flaky_nebula.sql','0002_moaning_zarda.sql'])await client.exec(await readFile(new URL(`../../../packages/db/migrations/${name}`,import.meta.url),'utf8'));
  await client.exec(billingMigration);await client.exec(billingMigration);
  const db=drizzle(client,{schema}) as unknown as Parameters<typeof createBilling>[0];
  const [user]=await db.insert(schema.users).values({name:'Owner',email:'owner@test.ee'}).returning();
  const [company]=await db.insert(schema.companies).values({name:'Firma',slug:'firma',registrationCode:'12345678',category:'Teenused',municipality:'Harku vald',email:'firma@test.ee',website:'',requestedPlan:'visibility',preferredSubscription:2,status:'pending'}).returning();
  await db.insert(schema.memberships).values({userId:user!.id,companyId:company!.id,role:'owner'});
  const sessions=new Map<string,{id:string;url:string;status:string;success_url:string}>();let requests=0;
  const transport:typeof fetch=async(url,init)=>{
   const path=String(url).split('/v1/')[1]!;
   if(path==='checkout/sessions'){
    const body=new URLSearchParams(String(init?.body));assert.equal(body.get('line_items[0][price_data][unit_amount]'),'5000');assert.ok(body.get('success_url')?.startsWith('https://web.test/portaal/pakett?'));assert.ok(body.get('cancel_url')?.startsWith('https://web.test/portaal/pakett?'));
    const id=`cs_test_${++requests}`;const session={id,url:`https://checkout.stripe.com/c/pay/${id}`,status:'open',success_url:body.get('success_url')!};sessions.set(id,session);return Response.json(session);
   }
   const id=path.split('/')[2]!;const session=sessions.get(id)!;if(path.endsWith('/expire'))session.status='expired';return Response.json(session);
  };
  const billing=createBilling(db,transport);const id=company!.id;const uid=user!.id;
  assert.equal((await billing.overview(uid)).companies[0]!.currentSubscription,null);assert.equal((await billing.overview(uid)).companies[0]!.preferredSubscription,2);
  await assert.rejects(billing.checkout(uid,id),/kinnitamist/);
  await client.query("UPDATE companies SET status='published' WHERE id=$1",[id]);
  await assert.rejects(billing.checkout('00000000-0000-4000-8000-000000000000',id),/ei leitud/);
  const checkout=await billing.checkout(uid,id);assert.match(checkout.url,/checkout.stripe.com/);assert.equal((await billing.overview(uid)).companies[0]!.plan,'free');
  assert.deepEqual(await billing.checkout(uid,id),checkout);assert.equal(requests,1);
  await billing.choose(uid,id,'free');assert.equal(sessions.get('cs_test_1')!.status,'expired');assert.equal((await billing.overview(uid)).companies[0]!.requestedPlan,'free');assert.equal((await billing.overview(uid)).companies[0]!.currentSubscription,1);assert.equal((await billing.overview(uid)).companies[0]!.preferredSubscription,2);await client.exec(billingMigration);assert.equal((await billing.overview(uid)).companies[0]!.currentSubscription,1);assert.equal((await billing.overview(uid)).companies[0]!.preferredSubscription,2);
  await assert.rejects(billing.checkout(uid,id),/Tasuta/);
  await billing.choose(uid,id,'visibility');await client.query('UPDATE companies SET preferred_subscription=1 WHERE id=$1',[id]);await assert.rejects(billing.checkout(uid,id,'employer'),/muutunud/);await billing.checkout(uid,id,'visibility');
  const [record]=await db.select().from(schema.billingCheckouts).where((await import('drizzle-orm')).eq(schema.billingCheckouts.stripeSessionId,'cs_test_2'));
  const event={type:'checkout.session.completed',data:{object:{id:'cs_test_2',payment_status:'paid',amount_total:5000,currency:'eur',client_reference_id:record!.id}}};
  await assert.rejects(billing.webhook({...event,data:{object:{...event.data.object,amount_total:1}}}),/mismatch/);
  await billing.webhook({...event,data:{object:{...event.data.object,payment_status:'unpaid'}}});assert.equal((await billing.overview(uid)).companies[0]!.plan,'free');
  await billing.webhook(event);const activated=(await billing.overview(uid)).companies[0]!;assert.equal(activated.plan,'visibility');assert.equal(activated.currentSubscription,2);assert.equal(activated.preferredSubscription,1);
  await billing.webhook(event);assert.equal((await billing.overview(uid)).companies[0]!.paidUntil,activated.paidUntil);
  await assert.rejects(billing.choose(uid,id,'free'),/Aktiivse/);
  await client.query("UPDATE companies SET paid_until=now()-interval '1 second' WHERE id=$1",[id]);assert.equal((await billing.overview(uid)).companies[0]!.plan,'free');
  await billing.checkout(uid,id);const stale=sessions.get('cs_test_3')!;stale.success_url='https://retired-portal.test/pakett';await billing.checkout(uid,id);assert.equal(stale.status,'expired');assert.equal(requests,4);
  const transfer=createPortalTransfer(db);const {code}=await transfer.issue('__Secure-leek.session_token=signed; other=secret');assert.match(code,/^[a-f0-9]{64}$/);assert.equal(await transfer.redeem(code),'__Secure-leek.session_token=signed');assert.equal(await transfer.redeem(code),undefined);
  const expired=await transfer.issue('leek.session_token=signed');await client.exec("UPDATE portal_tickets SET expires_at=now()-interval '1 second'");assert.equal(await transfer.redeem(expired.code),undefined);
  const raw=JSON.stringify(event);const timestamp=Math.floor(Date.now()/1000);const signature=createHmac('sha256','secret').update(`${timestamp}.${raw}`).digest('hex');
  assert.equal(verifyStripeSignature(raw,`t=${timestamp},v1=${signature}`,'secret'),true);assert.equal(verifyStripeSignature(raw+'x',`t=${timestamp},v1=${signature}`,'secret'),false);assert.equal(verifyStripeSignature(raw,`t=${timestamp},v1=${signature}`,'secret',Date.now()+400000),false);
 }finally{await client.close();for(const [key,value]of Object.entries({STRIPE_SECRET_KEY:original.key,STRIPE_WEBHOOK_SECRET:original.secret,BETTER_AUTH_URL:original.portal})){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});

test('subscription migration preserves paid accounts and backfills preferences only once', async () => {
 const client = new PGlite();
 try {
  for (const name of ['0000_stormy_paibok.sql', '0001_flaky_nebula.sql', '0002_moaning_zarda.sql']) await client.exec(await readFile(new URL(`../../../packages/db/migrations/${name}`, import.meta.url), 'utf8'));
  await client.exec(`INSERT INTO companies (name,slug,registration_code,category,municipality,email,website,requested_plan,plan,status,paid_until) VALUES
   ('Paid','paid','98765431','Teenused','Harku vald','paid@test.ee','','visibility','visibility','published',now()+interval '1 year'),
   ('Waiting','waiting','98765432','Teenused','Harku vald','waiting@test.ee','','employer','free','published',null),
   ('Free','free','98765433','Teenused','Harku vald','free@test.ee','','free','free','published',null)`);
  await client.exec(billingMigration);
  const rows = (await client.query<{slug:string;preferred_subscription:number;current_subscription:number|null}>('SELECT slug,preferred_subscription,current_subscription FROM companies ORDER BY slug')).rows;
  assert.deepEqual(rows.map(row => [row.slug,row.preferred_subscription,row.current_subscription]), [['free',1,null],['paid',2,2],['waiting',3,null]]);
  await client.exec("UPDATE companies SET current_subscription=1 WHERE slug='waiting'");
  await client.exec(billingMigration);
  const [after] = (await client.query<{preferred_subscription:number;current_subscription:number}>('SELECT preferred_subscription,current_subscription FROM companies WHERE slug=\'waiting\'')).rows;
  assert.equal(after!.preferred_subscription,3); assert.equal(after!.current_subscription,1);
  await assert.rejects(client.exec("UPDATE companies SET current_subscription=0 WHERE slug='free'"));
 } finally { await client.close(); }
});
