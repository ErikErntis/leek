import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { companyListSchema, privateCompanySchema } from '@leek/contracts';
export async function adminFetch(path:string) {
 const cookie=(await headers()).get('cookie')??'';
 if(!cookie)redirect('/logi-sisse');
 const response=await fetch(new URL(path,process.env.API_URL),{headers:{cookie},cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(response.status===401)redirect('/logi-sisse');
 if(response.status===403)redirect('/puudub-ligipaas');
 if(response.status===404)notFound();
 if(!response.ok)throw new Error('Halduskeskuse andmete laadimine ebaõnnestus.');
 return response.json();
}
export const requireAdmin=cache(async()=>{await adminFetch('/v1/admin/access');});
export async function getCompanies(status='pending',offset=0) {await requireAdmin();return companyListSchema.parse(await adminFetch(`/v1/admin/companies?status=${encodeURIComponent(status)}&offset=${offset}`));}
export async function getCompany(id:string) {await requireAdmin();if(!/^[0-9a-f-]{36}$/i.test(id))notFound();return privateCompanySchema.parse(await adminFetch(`/v1/admin/companies/${id}`));}
export const statusNames:Record<string,string>={pending:'Ootel',published:'Kinnitatud',rejected:'Tagasi lükatud',draft:'Mustand'};
export const planLabels:Record<string,string>={free:'Alustaja',visibility:'Edendaja',employer:'Eestvedaja'};
