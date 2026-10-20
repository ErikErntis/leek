import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';
import { demoData } from '@leek/contracts/demo';
import { canManageCompany, hasFeature } from '@leek/auth';
const app=createApp({check:async()=>{},readPublic:async()=>structuredClone(demoData)},['http://localhost:3000']);
test('directory combines category, municipality and case-insensitive keyword',async()=>{
 const response=await app.request('/v1/companies?category=Tootmine&municipality='+encodeURIComponent('Lääne-Harju vald')+'&q=PUIT');
 assert.equal(response.status,200);const body=await response.json();assert.equal(body.items.length,1);assert.equal(body.items[0].slug,'ranniku-puit');
});
test('invalid query is rejected',async()=>{assert.equal((await app.request('/v1/companies?q='+'x'.repeat(121))).status,400);});
test('unknown profile returns 404',async()=>{assert.equal((await app.request('/v1/companies/missing')).status,404);});
test('unpublished businesses, their content, drafts and expired content stay private',async()=>{
 const data=structuredClone(demoData);data.companies[0]!.status='pending';data.jobs.push({...data.jobs[0]!,id:'20000000-0000-4000-8000-000000000002',companyId:data.companies[1]!.id,status:'draft'});data.offers[1]!.expiresAt='2000-01-01T00:00:00Z';
 const app=createApp({check:async()=>{},readPublic:async()=>data});const response=await app.request('/v1/public');const body=await response.json();assert.equal(body.companies.length,4);assert.equal(body.jobs.length,0);assert.equal(body.offers.length,0);assert.equal((await app.request('/v1/companies/ranniku-puit')).status,404);
});
test('health reflects repository availability',async()=>{const app=createApp({check:async()=>{throw new Error('db down')},readPublic:async()=>demoData});assert.equal((await app.request('/health')).status,503);});
test('untrusted origins receive no CORS access',async()=>{const r=await app.request('/v1/public',{headers:{Origin:'https://untrusted.example'}});assert.equal(r.headers.get('access-control-allow-origin'),null);});
test('no anonymous write endpoints',async()=>{assert.equal((await app.request('/v1/companies',{method:'POST',body:'{}'})).status,404);});
test('company access requires membership or verified admin',()=>{assert.equal(canManageCompany(null,'a'),false);assert.equal(canManageCompany({userId:'u',platformRole:'member',memberships:[{companyId:'b',role:'owner'}]},'a'),false);assert.equal(canManageCompany({userId:'u',platformRole:'member',memberships:[{companyId:'a',role:'editor'}]},'a'),true);});
test('expired or unconfirmed paid plans lose paid features',()=>{const now=new Date('2026-10-19T00:00:00Z');assert.equal(hasFeature('employer','jobs',null,now),false);assert.equal(hasFeature('employer','jobs',new Date('2026-10-18'),now),false);assert.equal(hasFeature('employer','jobs',new Date('2027-01-01'),now),true);assert.equal(hasFeature('visibility','jobs',new Date('2027-01-01'),now),false);assert.equal(hasFeature('free','profile',null,now),true);});
