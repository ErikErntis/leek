import 'server-only';
import { headers } from 'next/headers';
import { privateCompanySchema, ownProfileSchema } from '@leek/contracts';
import { notFound } from 'next/navigation';

export async function getOwnCompany(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const response = await fetch(new URL(`/v1/my/companies/${id}`, process.env.API_URL), { headers: { cookie: (await headers()).get('cookie') ?? '' }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (response.status === 404 || response.status === 403) notFound();
  if (!response.ok) throw new Error('Ettevõtte andmete laadimine ebaõnnestus.');
  return privateCompanySchema.parse(await response.json());
}

export async function getOwnProfile(id:string){
 if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
 const response=await fetch(new URL(`/v1/my/companies/${id}/profile`,process.env.API_URL),{headers:{cookie:(await headers()).get('cookie')??''},cache:'no-store',signal:AbortSignal.timeout(15000)});
 if (response.status===404||response.status===403)notFound();
 if (!response.ok)throw new Error('Profiili laadimine ebaõnnestus.');
 return ownProfileSchema.parse(await response.json());
}
