import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { and, eq, desc } from 'drizzle-orm';
import { companies, companyMedia, memberships, users, type createDatabase } from '@leek/db';
import type { AuthHandler } from './app';

type Database=ReturnType<typeof createDatabase>['db'];
export async function prepareImage(bytes:Buffer,kind:'image'|'logo') {
 if(!bytes.length || bytes.length>5*1024*1024)throw new Error('Pildi suurus võib olla kuni 5 MB.');
 const image=sharp(bytes,{limitInputPixels:25_000_000,animated:false});
 const meta=await image.metadata();
 if(!['jpeg','png','webp'].includes(meta.format??'') || (meta.pages??1)>1)throw new Error('Vali JPG-, PNG- või WebP-pilt.');
 if(!meta.width||!meta.height||meta.width<64||meta.height<64)throw new Error('Pildi küljed peavad olema vähemalt 64 pikslit.');
 return image.rotate().resize({width:kind==='logo'?512:1920,height:kind==='logo'?512:1080,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
}
export function createMediaRoutes(db:Database,auth:AuthHandler,origins:string[]) {
 const app=new Hono();
 const configured=Boolean(process.env.BUCKET_ENDPOINT&&process.env.BUCKET_NAME&&process.env.BUCKET_ACCESS_KEY_ID&&process.env.BUCKET_SECRET_ACCESS_KEY);
 const bucket=process.env.BUCKET_NAME??'';
 const s3=configured?new S3Client({endpoint:process.env.BUCKET_ENDPOINT,region:process.env.BUCKET_REGION??'auto',forcePathStyle:process.env.BUCKET_FORCE_PATH_STYLE==='true',credentials:{accessKeyId:process.env.BUCKET_ACCESS_KEY_ID!,secretAccessKey:process.env.BUCKET_SECRET_ACCESS_KEY!},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED',maxAttempts:2}):null;
 app.post('/v1/uploads/:companyId/:kind',bodyLimit({maxSize:5*1024*1024}),async c=>{
  if(!origins.includes(c.req.header('origin')??''))return c.json({error:'Päringu päritolu pole lubatud.'},403);
  const session=await auth.api.getSession({headers:c.req.raw.headers,query:{disableRefresh:true}});
  if(!session)return c.json({error:'Palun logi sisse.'},401);
  const id=c.req.param('companyId'),kind=c.req.param('kind');
  if(!/^[a-f0-9-]{36}$/i.test(id)||!['image','logo'].includes(kind))return c.json({error:'Vigane päring.'},400);
  const [member]=await db.select().from(memberships).where(and(eq(memberships.companyId,id),eq(memberships.userId,session.user.id),eq(memberships.role,'owner')));
  if(!member)return c.json({error:'Ettevõtet ei leitud.'},404);
  const [company]=await db.select().from(companies).where(eq(companies.id,id));
  if(company?.status==='pending')return c.json({error:'Esmane taotlus on ülevaatamisel.'},409);
  if(!s3)return c.json({error:'Piltide salvestus pole veel seadistatud.'},503);
  // Persistent throttle, shared by all API replicas.
  const recent=await db.select().from(companyMedia).where(eq(companyMedia.companyId,id)).orderBy(desc(companyMedia.createdAt)).limit(20);
  if(recent.length===20&&recent[19]!.createdAt.getTime()>Date.now()-3600000)return c.json({error:'Üleslaadimise piir täis. Proovi tunni pärast uuesti.'},429);
  let body:Buffer;
  try{body=await prepareImage(Buffer.from(await c.req.arrayBuffer()),kind as 'image'|'logo');}catch{return c.json({error:'Vali korrektne JPG-, PNG- või WebP-pilt (64 px kuni 25 megapikslit, kuni 5 MB).'},400);}
  const mediaId=randomUUID(),key=`companies/${id}/${mediaId}.webp`;
  await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:body,ContentType:'image/webp',CacheControl:'private,max-age=3600'}),{abortSignal:AbortSignal.timeout(15000)});
  try{await db.insert(companyMedia).values({id:mediaId,companyId:id,kind,key});}catch(error){await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:key})).catch(()=>{});throw error;}
  c.header('Cache-Control','no-store');
  return c.json({url:`/api/media/${mediaId}`},201);
 });
 app.get('/v1/media/:id',async c=>{
  c.header('Cache-Control','private, no-store');
  const id=c.req.param('id');if(!/^[a-f0-9-]{36}$/i.test(id))return c.notFound();
  const [asset]=await db.select().from(companyMedia).where(eq(companyMedia.id,id));if(!asset||!s3)return c.notFound();
  const [company]=await db.select().from(companies).where(eq(companies.id,asset.companyId));
  const url=`/api/media/${id}`;
  const published=company?.status==='published'&&(company.image===url||company.logo===url);
  if(!published){
   const session=await auth.api.getSession({headers:c.req.raw.headers,query:{disableRefresh:true}});if(!session)return c.notFound();
   const [member]=await db.select().from(memberships).where(and(eq(memberships.companyId,asset.companyId),eq(memberships.userId,session.user.id)));
   const [user]=await db.select().from(users).where(eq(users.id,session.user.id));
   if(!member&&user?.role!=='admin')return c.notFound();
  }
  return c.redirect(await getSignedUrl(s3,new GetObjectCommand({Bucket:bucket,Key:asset.key}),{expiresIn:300}),302);
 });
 app.onError((error,c)=>{console.error('Media request failed',error.name);return c.json({error:'Pildi salvestus ei vasta. Proovi uuesti.'},503);});
 return app;
}
