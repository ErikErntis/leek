import { proxyRequest } from '../../../../lib/proxy';

export function GET(request: Request) {
 return proxyRequest(request, '/v1/admin/site-content');
}
export function POST(request: Request) {
 return proxyRequest(request, '/v1/admin/site-content', 131072);
}
