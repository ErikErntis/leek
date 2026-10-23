import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiURL,portalOrigin } from '../../../lib/portal';
export async function GET(request:Request){
 const query=new URL(request.url).searchParams;const state=(await cookies()).get('leek.portal_state')?.value;
 if(!state||state!==query.get('state')||!query.get('code'))return NextResponse.redirect(new URL('/auth/start',portalOrigin()));
 const upstream=await fetch(apiURL('/v1/portal-transfer/redeem'),{method:'POST',headers:{origin:portalOrigin(),'content-type':'application/json'},body:JSON.stringify({code:query.get('code')}),cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!upstream.ok)return NextResponse.redirect(new URL('/auth/start',portalOrigin()));
 const {cookie}=await upstream.json() as {cookie:string};const at=cookie.indexOf('=');const name=cookie.slice(0,at);const value=cookie.slice(at+1);
 const response=NextResponse.redirect(new URL('/',portalOrigin()));response.cookies.set(name,decodeURIComponent(value),{httpOnly:true,secure:portalOrigin().startsWith('https:'),sameSite:'lax',path:'/'});response.cookies.delete('leek.portal_state');response.headers.set('Referrer-Policy','no-referrer');response.headers.set('Cache-Control','no-store');return response;
}
