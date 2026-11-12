import { headers } from 'next/headers';
import { apiURL, portalOrigin } from '../../../../lib/portal';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function POST(request: Request, { params }: { params: Promise<{ parts?: string[] }> }) {
 if (request.headers.get('origin') !== portalOrigin()) return Response.json({ error: 'Päringu päritolu pole lubatud.' }, { status: 403 });
 if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') return new Response(null, { status: 415 });
 const { parts = [] } = await params;
 const company = new URL(request.url).searchParams.get('company');
 if (parts.length > 1 || (parts[0] && !uuid.test(parts[0])) || (company !== null && (!parts.length || !uuid.test(company)))) {
  return new Response(null, { status: 404 });
 }
 const reader = request.body?.getReader();
 if (!reader) return new Response(null, { status: 400 });
 let length = 0;
 const chunks: Uint8Array[] = [];
 for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  length += value.byteLength;
  if (length > 20_000) {
   await reader.cancel();
   return Response.json({ error: 'Päring on liiga pikk.' }, { status: 413 });
  }
  chunks.push(value);
 }
 const url = apiURL(parts[0] ? `/v1/my/inquiries/${parts[0]}` : '/v1/my/inquiries');
 if (company) url.searchParams.set('company', company);
 try {
  const response = await fetch(url, {
   method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
   headers: { cookie: (await headers()).get('cookie') ?? '', origin: portalOrigin(), 'content-type': 'application/json' },
   body: Buffer.concat(chunks),
  });
  return new Response(response.body, { status: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
 } catch {
  return Response.json({ error: 'Päringuteenusega ei saanud ühendust. Proovi uuesti.' }, { status: 503 });
 }
}
