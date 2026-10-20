import { authApiURL } from '../../../../lib/auth-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const routes: Record<string, string> = { 'sign-up/email': 'POST', 'sign-in/email': 'POST', 'sign-out': 'POST', 'get-session': 'GET' };
const unavailable = () => Response.json({ error: { code: 'AUTH_UNAVAILABLE' } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

async function handler(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join('/');
  if (!routes[path]) return new Response(null, { status: 404 });
  if (routes[path] !== request.method) return new Response(null, { status: 405, headers: { Allow: routes[path]! } });
  const headers = new Headers();
  for (const name of ['cookie', 'user-agent', 'origin']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let body: string | undefined;
  if (request.method === 'POST') {
    if (!process.env.SITE_URL) return unavailable();
    const origin = new URL(process.env.SITE_URL).origin;
    if (request.headers.get('origin') !== origin) return Response.json({ error: { code: 'INVALID_ORIGIN' } }, { status: 403 });
    if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') return new Response(null, { status: 415 });
    if (Number(request.headers.get('content-length')) > 16384) return new Response(null, { status: 413 });
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400 });
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16384) { await reader.cancel(); return new Response(null, { status: 413 }); }
      chunks.push(value);
    }
    body = new TextDecoder().decode(Buffer.concat(chunks));
    headers.set('content-type', 'application/json');
  }
  try {
    const url = authApiURL(path);
    if (path === 'get-session') url.searchParams.set('disableRefresh', 'true');
    const response = await fetch(url, { method: request.method, headers, body, cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (response.status >= 300 && response.status < 400) return unavailable();
    const outgoing = new Headers({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json' });
    for (const cookie of response.headers.getSetCookie()) outgoing.append('Set-Cookie', cookie);
    const retry = response.headers.get('retry-after');
    if (retry) outgoing.set('Retry-After', retry);
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch { return unavailable(); }
}

export { handler as GET, handler as POST };
