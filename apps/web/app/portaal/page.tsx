import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '../../lib/session';
import { authApiURL } from '../../lib/auth-api';
import { PortalLogin } from './portal-login';
export const dynamic='force-dynamic';
export const metadata={title:'Ava ettevõtte portaal',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function PortalEntry({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const state=(await searchParams).state;
 const portal=new URL(process.env.PORTAL_URL??'http://localhost:3001').origin;
 if(typeof state!=='string'||!/^[a-f0-9]{64}$/.test(state))redirect(`${portal}/auth/start`);
 if(!await getSession())return <PortalLogin/>;
 const response=await fetch(new URL('/v1/portal-transfer/issue',authApiURL('get-session')),{method:'POST',headers:{origin:new URL(process.env.SITE_URL!).origin,cookie:(await headers()).get('cookie')??'','content-type':'application/json'},body:'{}',cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Portaali avamine ebaõnnestus. Proovi uuesti.');
 const {code}=await response.json();const target=new URL('/auth/callback',portal);target.searchParams.set('code',code);target.searchParams.set('state',state);redirect(target.toString());
}
