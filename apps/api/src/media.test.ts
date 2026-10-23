import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {drizzle} from 'drizzle-orm/pglite';
import sharp from 'sharp';
import * as schema from '@leek/db/schema';
import {createAuth} from '@leek/auth/server';
import {createMediaRoutes,prepareImage} from './media';
import {createProfileService} from './company-profile';
import {billingMigration} from '../../../packages/db/src/migrate-billing';

test('media validates, re-encodes, signs private storage and requires approval before public access',async()=>{
 const client=new PGlite();const objects:Buffer[]=[];
 const server=createServer(async(req,res)=>{const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(chunk);objects.push(Buffer.concat(chunks));res.writeHead(200,{'ETag':'"test"'}).end();});
 server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address() as {port:number};
 Object.assign(process.env,{BUCKET_ENDPOINT:`http://127.0.0.1:${address.port}`,BUCKET_NAME:'local-test',BUCKET_ACCESS_KEY_ID:'test',BUCKET_SECRET_ACCESS_KEY:'test-secret',BUCKET_REGION:'auto',BUCKET_FORCE_PATH_STYLE:'true'});
 try{
  for(const name of ['0000_stormy_paibok.sql','0001_flaky_nebula.sql','0002_moaning_zarda.sql'])await client.exec(await readFile(new URL(`../../../packages/db/migrations/${name}`,import.meta.url),'utf8'));
  await client.exec(billingMigration);await client.exec(billingMigration);
  const db=drizzle(client,{schema}) as unknown as Parameters<typeof createAuth>[0];
  const auth=createAuth(db,{publicURL:'https://web.test',adminURL:'https://admin.test',secret:'local-tests-only-secret-long-enough-for-better-auth'});
  async function signup(email:string){const response=await auth.handler(new Request('https://web.test/api/auth/sign-up/email',{method:'POST',headers:{origin:'https://web.test','Content-Type':'application/json'},body:JSON.stringify({name:'Test Owner',email,password:'Test-password-42'})}));assert.equal(response.status,200);const data=await response.json();return {id:data.user.id as string,cookie:response.headers.getSetCookie().find(x=>x.startsWith('__Secure-leek.session_token='))!.split(';')[0]!};}
  const owner=await signup('owner@media.test'),other=await signup('other@media.test');
  const profile={name:'Pildi Firma OÜ',brandName:'',category:'Tootmine' as const,additionalCategories:[],municipality:'Lääne-Harju vald',settlement:'Paldiski',address:'Ranna 1',email:'tere@pilt.test',phone:'+372 55555555',website:'https://pilt.test',employees:'2–9' as const,tagline:'Ilusad pildid kohalikult ettevõttelt.',description:'Valmistame kohalikele klientidele tooteid ning pakume professionaalset teenust.'};
  const [company]=await db.insert(schema.companies).values({...profile,slug:'pildifirma',registrationCode:'12345678',status:'published'}).returning();
  await db.insert(schema.memberships).values({companyId:company!.id,userId:owner.id,role:'owner'});
  const app=createMediaRoutes(db,auth,['https://web.test']);
  const png=await sharp({create:{width:100,height:100,channels:4,background:{r:1,g:2,b:3,alpha:0.5}}}).png().toBuffer();
  await assert.rejects(prepareImage(Buffer.from('<svg></svg>'),'logo'));
  await assert.rejects(prepareImage(await sharp({create:{width:10,height:10,channels:3,background:'white'}}).png().toBuffer(),'logo'));
  const upload=(cookie?:string,origin='https://web.test',bytes=png)=>app.request(`https://api.test/v1/uploads/${company!.id}/logo`,{method:'POST',headers:{origin,...(cookie?{cookie}:{})},body:bytes});
  assert.equal((await upload()).status,401);assert.equal((await upload(other.cookie)).status,404);assert.equal((await upload(owner.cookie,'https://evil.test')).status,403);assert.equal((await upload(owner.cookie,'https://web.test',Buffer.from('fake png'))).status,400);
  const response=await upload(owner.cookie);assert.equal(response.status,201,await response.clone().text());const {url}=await response.json();
  assert.equal(objects.length,1);assert.equal((await sharp(objects[0]).metadata()).format,'webp');
  const path=url.replace('/api/media/','/v1/media/');
  assert.equal((await app.request(path)).status,404);assert.equal((await app.request(path,{headers:{cookie:other.cookie}})).status,404);
  const preview=await app.request(path,{headers:{cookie:owner.cookie}});assert.equal(preview.status,302);assert.match(preview.headers.get('location')!,/X-Amz-Signature=/);
  const profiles=createProfileService(db),contact={name:'Owner',role:'',email:'private@pilt.test',phone:''};
  await assert.rejects(profiles.save(owner.id,company!.id,{version:0,publicProfile:{...profile,logo:'https://evil.test/logo.png'},contact}));
  const saved=await profiles.save(owner.id,company!.id,{version:0,publicProfile:{...profile,logo:url},contact});assert.equal(saved.company.logo,'');assert.equal((await app.request(path)).status,404);
  await profiles.review(owner.id,saved.revision!.id,'approve','');
  assert.equal((await app.request(path)).status,302);
  const fresh=await profiles.own(owner.id,company!.id);await profiles.save(owner.id,company!.id,{version:fresh.version,publicProfile:{...profile,logo:''},contact});
  const pending=(await profiles.own(owner.id,company!.id)).revision!;await profiles.review(owner.id,pending.id,'approve','');assert.equal((await app.request(path)).status,404);
 }finally{server.close();await client.close();}
});
