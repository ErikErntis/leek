import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { webOrigin, portalOrigin } from '../../../lib/portal';
export async function GET(){
 const state=randomBytes(32).toString('hex');const target=new URL('/portaal',webOrigin());target.searchParams.set('state',state);
 const response=NextResponse.redirect(target);response.cookies.set('leek.portal_state',state,{httpOnly:true,secure:portalOrigin().startsWith('https:'),sameSite:'lax',path:'/',maxAge:600});response.headers.set('Cache-Control','no-store');return response;
}
