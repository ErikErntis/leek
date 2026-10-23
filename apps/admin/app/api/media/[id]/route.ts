import { cookies } from 'next/headers';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))return new Response(null,{status:404});
 try {
  const response=await fetch(new URL(`/v1/media/${id}`,process.env.API_URL),{headers:{cookie:(await cookies()).toString()},cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(15000)});
  const location=response.headers.get('location');
  if(response.status===302&&location)return new Response(null,{status:302,headers:{Location:location,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
  return new Response(null,{status:response.status===404?404:503,headers:{'Cache-Control':'no-store'}});
 }catch{return new Response(null,{status:503});}
}
