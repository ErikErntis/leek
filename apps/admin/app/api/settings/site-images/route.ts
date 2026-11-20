export async function POST(request: Request) {
 if (!process.env.ADMIN_URL || request.headers.get('origin') !== new URL(process.env.ADMIN_URL).origin) {
  return Response.json({ error: 'Päringu päritolu pole lubatud.' }, { status: 403 });
 }
 try {
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
   const { done, value } = await reader.read();
   if (done) break;
   size += value.byteLength;
   if (size > 5 * 1024 * 1024) { await reader.cancel(); return Response.json({ error: 'Pildi suurus võib olla kuni 5 MB.' }, { status: 413 }); }
   chunks.push(value);
  }
  const headers = new Headers({ cookie: request.headers.get('cookie') ?? '', origin: request.headers.get('origin')!, 'content-type': request.headers.get('content-type') ?? 'application/octet-stream' });
  const response = await fetch(new URL('/v1/admin/site-images', process.env.API_URL), {
   method: 'POST', headers, body: Buffer.concat(chunks), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(25000),
  });
  return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
 } catch { return Response.json({ error: 'Pildi üleslaadimine ebaõnnestus.' }, { status: 503 }); }
}
