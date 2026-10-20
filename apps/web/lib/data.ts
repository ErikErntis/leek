import { demoData } from '@leek/contracts/demo';
import { publicDataSchema, type PublicData } from '@leek/contracts';
export async function getPublicData(): Promise<PublicData> {
 if(process.env.DEMO_MODE==='true')return structuredClone(demoData);
 if(!process.env.API_URL)throw new Error('API_URL is required outside demo mode');
 const response=await fetch(new URL('/v1/public',process.env.API_URL),{cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error('LEEK API unavailable');
 return publicDataSchema.parse(await response.json());
}
export const siteUrl=process.env.SITE_URL??'http://localhost:3000';
