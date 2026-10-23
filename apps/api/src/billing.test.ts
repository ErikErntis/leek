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
 const original={key:process.env.STRIPE_SECRET_KEY,secret:process.env.STRIPE_WEBHOOK_SECRET,portal:process.env.PORTAL_URL};
 process.env.STRIPE_SECRET_KEY='sk_test_local';process.env.STRIPE_WEBHOOK_SECRET='whsec_test';process.env.PORTAL_URL='https://portal.test';
 try{
  for(const name of ['0000_stormy_paibok.sql','0001_flaky_nebula.sql','0002_moaning_zarda.sql'])await client.exec(await readFile(new URL(`../../../packages/db/migrations/${name}`,import.meta.url),'utf8'));
  await client.exec(billingMigration);await client.exec(billingMigration);
  const db=drizzle(client,{schema}) as unknown as Parameters<typeof createBilling>[0];
  const [user]=await db.insert(schema.users).values({name:'Owner',email:'owner@test.ee'}).returning();
  const [company]=await db.insert(schema.companies).values({name:'Firma',slug:'firma',registrationCode:'12345678',category:'Teenused',municipality:'Harku vald',email:'firma@test.ee',website:'',requestedPlan:'visibility',status:'pending'}).returning();
  await db.insert(schema.memberships).values({userId:user!.id,companyId:company!.id,role:'owner'});
  const sessions=new Map<string,{id:string;url:string;status:string}>();let requests=0;
  const transport:typeof fetch=async(url,init)=>{
   const path=String(url).split('/v1/')[1]!;
   if(path==='checkout/sessions'){
    const body=new URLSearchParams(String(init?.body));assert.equal(body.get('line_items[0][price_data][unit_amount]'),'5000');
    const id=`cs_test_${++requests}`;const session={id,url:`https://checkout.stripe.com/c/pay/${id}`,status:'open'};sessions.set(id,session);return Response.json(session);
   }
   const id=path.split('/')[2]!;const session=sessions.get(id)!;if(path.endsWith('/expire'))session.status='expired';return Response.json(session);
  };
  const billing=createBilling(db,transport);const id=company!.id;const uid=user!.id;
  await assert.rejects(billing.checkout(uid,id),/kinnitamist/);
  await client.query("UPDATE companies SET status='published' WHERE id=$1",[id]);
  await assert.rejects(billing.checkout('00000000-0000-4000-8000-000000000000',id),/ei leitud/);
  const checkout=await billing.checkout(uid,id);assert.match(checkout.url,/checkout.stripe.com/);assert.equal((await billing.overview(uid)).companies[0]!.plan,'free');
  assert.deepEqual(await billing.checkout(uid,id),checkout);assert.equal(requests,1);
  await billing.choose(uid,id,'free');assert.equal(sessions.get('cs_test_1')!.status,'expired');assert.equal((await billing.overview(uid)).companies[0]!.requestedPlan,'free');
  await assert.rejects(billing.checkout(uid,id),/Tasuta/);
  await billing.choose(uid,id,'visibility');await billing.checkout(uid,id);
  const [record]=await db.select().from(schema.billingCheckouts).where((await import('drizzle-orm')).eq(schema.billingCheckouts.stripeSessionId,'cs_test_2'));
  const event={type:'checkout.session.completed',data:{object:{id:'cs_test_2',payment_status:'paid',amount_total:5000,currency:'eur',client_reference_id:record!.id}}};
  await assert.rejects(billing.webhook({...event,data:{object:{...event.data.object,amount_total:1}}}),/mismatch/);
  await billing.webhook({...event,data:{object:{...event.data.object,payment_status:'unpaid'}}});assert.equal((await billing.overview(uid)).companies[0]!.plan,'free');
  await billing.webhook(event);const activated=(await billing.overview(uid)).companies[0]!;assert.equal(activated.plan,'visibility');
  await billing.webhook(event);assert.equal((await billing.overview(uid)).companies[0]!.paidUntil,activated.paidUntil);
  await assert.rejects(billing.choose(uid,id,'free'),/Aktiivse/);
  await client.query("UPDATE companies SET paid_until=now()-interval '1 second' WHERE id=$1",[id]);assert.equal((await billing.overview(uid)).companies[0]!.plan,'free');
  const transfer=createPortalTransfer(db);const {code}=await transfer.issue('__Secure-leek.session_token=signed; other=secret');assert.match(code,/^[a-f0-9]{64}$/);assert.equal(await transfer.redeem(code),'__Secure-leek.session_token=signed');assert.equal(await transfer.redeem(code),undefined);
  const expired=await transfer.issue('leek.session_token=signed');await client.exec("UPDATE portal_tickets SET expires_at=now()-interval '1 second'");assert.equal(await transfer.redeem(expired.code),undefined);
  const raw=JSON.stringify(event);const timestamp=Math.floor(Date.now()/1000);const signature=createHmac('sha256','secret').update(`${timestamp}.${raw}`).digest('hex');
  assert.equal(verifyStripeSignature(raw,`t=${timestamp},v1=${signature}`,'secret'),true);assert.equal(verifyStripeSignature(raw+'x',`t=${timestamp},v1=${signature}`,'secret'),false);assert.equal(verifyStripeSignature(raw,`t=${timestamp},v1=${signature}`,'secret',Date.now()+400000),false);
 }finally{await client.close();for(const [key,value]of Object.entries({STRIPE_SECRET_KEY:original.key,STRIPE_WEBHOOK_SECRET:original.secret,PORTAL_URL:original.portal})){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
