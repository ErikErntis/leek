import { createBilling } from './billing';
import { serve } from '@hono/node-server';
import { createDatabase, companies, jobs, offers } from '@leek/db';
import { demoData } from '@leek/contracts/demo';
import type { PublicData } from '@leek/contracts';
import { createApp, type Repository } from './app';
import { createAuth } from '@leek/auth/server';
import { createCompanyService } from './company-service';
const demo = process.env.DEMO_MODE === 'true';
if (!demo && !process.env.DATABASE_URL) throw new Error('Set DATABASE_URL or explicitly enable DEMO_MODE=true');
const database = !demo && process.env.DATABASE_URL ? createDatabase(process.env.DATABASE_URL) : null;
const secret = process.env.BETTER_AUTH_SECRET;
const publicURL = process.env.BETTER_AUTH_URL;
if (!demo && (!secret || !publicURL)) throw new Error('BETTER_AUTH_SECRET and BETTER_AUTH_URL are required outside demo mode');
const auth = database && secret && publicURL ? createAuth(database.db, { secret, publicURL, adminURL: process.env.ADMIN_URL }) : undefined;
const repository: Repository = {
 check:async()=>{if(database)await database.db.execute('select 1');},
 readPublic:async()=>{
  let data: PublicData;
  if(demo)data=structuredClone(demoData);
  else {
   const db=database!.db;
   const [allCompanies,allJobs,allOffers]=await Promise.all([db.select().from(companies),db.select().from(jobs),db.select().from(offers)]);
   data={companies:allCompanies.map(company => ({...company, plan: company.currentSubscription !== null && company.paidUntil && company.paidUntil > new Date() ? (company.currentSubscription === 3 ? 'employer' as const : company.currentSubscription === 2 ? 'visibility' as const : 'free' as const) : 'free' as const, featured: company.currentSubscription === 3 && company.featured && Boolean(company.paidUntil && company.paidUntil > new Date())})),jobs:allJobs.map(j=>({...j,expiresAt:j.expiresAt.toISOString()})),offers:allOffers.map(o=>({...o,expiresAt:o.expiresAt.toISOString()})),source:'database'};
  }
  return data;
 }
};
const port=Number(process.env.PORT??3003);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be a valid port');
const origins = Array.from(new Set([...(process.env.ALLOWED_ORIGINS ?? '').split(',').map(x=>x.trim()).filter(Boolean), ...(publicURL ? [new URL(publicURL).origin] : []), ...[process.env.ADMIN_URL].filter((x): x is string => Boolean(x)).map(x => new URL(x).origin)]));
const server=serve({fetch:createApp(repository,origins,auth,database ? createCompanyService(database.db) : undefined, database ? createBilling(database.db) : undefined).fetch,port,hostname:'0.0.0.0'});
console.log(`LEEK API listening on ${port} (${demo?'DEMO':'database'})`);
let closing=false;
async function shutdown(){if(closing)return;closing=true;server.close();await database?.close();process.exit(0);}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
