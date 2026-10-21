export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!process.env.SITE_URL || request.headers.get('origin') !== new URL(process.env.SITE_URL).origin) return Response.json({ error: 'Päringu päritolu pole lubatud.' }, { status: 403 });
    if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') return new Response(null, { status: 415 });
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 32768) { await reader.cancel(); return new Response(null, { status: 413 }); }
      chunks.push(value);
    }
    const response = await fetch(new URL('/v1/my/companies', process.env.API_URL), {
      method: 'POST', headers: { 'Content-Type': 'application/json', cookie: request.headers.get('cookie') ?? '', origin: request.headers.get('origin')! },
      body: Buffer.concat(chunks), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000),
    });
    return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Ettevõtte saatmine ebaõnnestus. Sisestatud andmed on vormis alles; proovi uuesti.' }, { status: 503 }); }
}
