import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getSession } from './session';
import type { Plan } from '@leek/contracts';
export type PortalCompany={id:string;name:string;slug:string;status:'draft'|'pending'|'published'|'rejected';reviewNote:string;requestedPlan:Plan;plan:Plan;paidUntil:string|null};
export type PortalData={companies:PortalCompany[];plans:{id:Plan;name:string;amount:number;features:string[]}[];checkoutAvailable:boolean};
export function apiURL(path:string){
 const url=new URL(process.env.API_URL??'http://localhost:3003');
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/')throw new Error('Set API_URL to the API origin');
 return new URL(path,url);
}
export const portalData=cache(async():Promise<PortalData>=>{
 if(!await getSession())redirect('/logi-sisse?next=%2Fportaal');
 const response=await fetch(apiURL('/v1/my/portal'),{headers:{cookie:(await cookies()).toString()},cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(response.status===401)redirect('/logi-sisse?next=%2Fportaal');
 if(!response.ok)throw new Error('Ettevõtte andmeid ei saanud laadida. Proovi uuesti.');
 return response.json();
});
export function webOrigin(){return new URL(process.env.SITE_URL??'http://localhost:3000').origin;}
export function portalOrigin(){return webOrigin();}
