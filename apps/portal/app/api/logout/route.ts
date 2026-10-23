import {cookies} from 'next/headers';
import {apiURL,portalOrigin} from '../../../lib/portal';
export async function POST(request:Request){
 if(request.headers.get('origin')!==portalOrigin())return Response.json({error:'Invalid origin'},{status:403});
 try{const response=await fetch(apiURL('/api/auth/sign-out'),{method:'POST',headers:{origin:portalOrigin(),cookie:(await cookies()).toString(),'content-type':'application/json'},body:'{}',cache:'no-store',signal:AbortSignal.timeout(15000)});const headers=new Headers({'content-type':'application/json','cache-control':'no-store'});for(const cookie of response.headers.getSetCookie())headers.append('set-cookie',cookie);return new Response(response.body,{status:response.status,headers});}catch{return Response.json({error:'Väljalogimine ebaõnnestus.'},{status:503});}
}
