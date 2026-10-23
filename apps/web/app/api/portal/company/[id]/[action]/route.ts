import {cookies} from 'next/headers';
import {apiURL,portalOrigin} from '../../../../../../lib/portal';
export async function POST(request:Request,{params}:{params:Promise<{id:string;action:string}>}){
 if(request.headers.get('origin')!==portalOrigin())return Response.json({error:'Päringu päritolu pole lubatud.'},{status:403});
 const {id,action}=await params;
 if(!/^[a-f0-9-]{36}$/i.test(id)||!['plan','checkout','profile'].includes(action))return new Response(null,{status:404});
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return new Response(null,{status:415});
 // Stream with a strict bound; do not buffer an unlimited request body.
 const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});let size=0;const chunks:Uint8Array[]=[];
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>(action==='profile'?32768:2048)){await reader.cancel();return new Response(null,{status:413});}chunks.push(value);}
 try{const response=await fetch(apiURL(`/v1/my/companies/${id}/${action}`),{method:'POST',headers:{origin:portalOrigin(),cookie:(await cookies()).toString(),'content-type':'application/json'},body:Buffer.concat(chunks),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});return new Response(response.body,{status:response.status,headers:{'content-type':'application/json','cache-control':'no-store'}});}catch(error){console.error('Portal API request failed',error instanceof Error?error.message:'Unknown error');return Response.json({error:'Teenusega ühendamine ebaõnnestus.'},{status:503});}
}

export async function GET(_request:Request,{params}:{params:Promise<{id:string;action:string}>}){
 const {id,action}=await params;
 if (!/^[a-f0-9-]{36}$/i.test(id)||action!=='profile')return new Response(null,{status:404});
 try {
  const response=await fetch(apiURL(`/v1/my/companies/${id}/profile`),{headers:{cookie:(await cookies()).toString()},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Profiili ei saanud laadida.'},{status:503});}
}
