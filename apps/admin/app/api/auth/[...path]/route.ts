import { proxyRequest } from '../../../../lib/proxy';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handler(request:Request,context:{params:Promise<{path:string[]}>}) {
 const path=(await context.params).path.join('/');
 const methods:Record<string,string>={'sign-in/email':'POST','sign-out':'POST','get-session':'GET'};
 if(!methods[path])return new Response(null,{status:404});
 if(methods[path]!==request.method)return new Response(null,{status:405});
 return proxyRequest(request,`/api/auth/${path}${path==='get-session'?'?disableRefresh=true':''}`);
}
export {handler as GET,handler as POST};
