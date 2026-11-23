import { proxyRequest } from '../../../../../lib/proxy';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
 const { id } = await context.params;
 if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return new Response(null, { status: 404 });
 return proxyRequest(request, `/v1/admin/work/${id}/review`);
}
