import 'server-only';
export async function proxyRequest(request: Request, path: string) {
 try {
  if (request.method === 'POST' && (!process.env.ADMIN_URL || request.headers.get('origin') !== new URL(process.env.ADMIN_URL).origin)) return Response.json({error:'Päringu päritolu pole lubatud.'},{status:403});
  const headers = new Headers();
  for (const name of ['cookie','origin','user-agent']) { const value=request.headers.get(name); if(value)headers.set(name,value); }
  let body: string | undefined;
  if(request.method==='POST') {
   if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return new Response(null,{status:415});
   const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});
   const chunks:Uint8Array[]=[];let size=0;
   for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();return new Response(null,{status:413});}chunks.push(value);}
   body=Buffer.concat(chunks).toString('utf8');headers.set('content-type','application/json');
  }
  const response=await fetch(new URL(path,process.env.API_URL),{method:request.method,headers,body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
  const outgoing=new Headers({'Content-Type':'application/json','Cache-Control':'no-store'});
  for(const cookie of response.headers.getSetCookie())outgoing.append('Set-Cookie',cookie);
  const retry=response.headers.get('retry-after');if(retry)outgoing.set('Retry-After',retry);
  return new Response(response.body,{status:response.status,headers:outgoing});
 }catch{return Response.json({error:'Teenusega ühendamine ebaõnnestus. Proovi uuesti.'},{status:503});}
}
