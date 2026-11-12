import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { WorkspaceShell } from '@leek/ui';
import type { ProductHelp } from '@leek/contracts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'E-poe liidestusabi', robots: { index: false, follow: false } };

async function api(path: string, body?: unknown) {
 const response = await fetch(new URL(path, process.env.API_URL), {
  method: body ? 'POST' : 'GET',
  headers: { cookie: (await headers()).get('cookie') ?? '', origin: new URL(process.env.ADMIN_URL!).origin, 'Content-Type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined,
  cache: 'no-store', signal: AbortSignal.timeout(15000),
 });
 if (response.status === 401) redirect('/logi-sisse');
 if (response.status === 403) redirect('/puudub-ligipaas');
 return response;
}

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
async function closeHelp(form: FormData) {
 'use server';
 const id = String(form.get('id') ?? '');
 if (!uuid.test(id)) redirect('/tooted?failed=1');
 const response = await api(`/v1/admin/product-help/${id}/resolve`, {});
 redirect(response.ok ? '/tooted?done=1' : '/tooted?failed=1');
}

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
 const [query, response] = await Promise.all([searchParams, api('/v1/admin/products')]);
 if (!response.ok) throw new Error('Toodete järjekorda ei saanud laadida.');
 const { requests } = await response.json() as { requests: ProductHelp[] };
 return <WorkspaceShell kind="admin" active="/tooted" demo={false} siteUrl={process.env.SITE_URL}>
  <div className="workspace-heading"><div><h1>E-poe liidestusabi</h1></div></div>
  {query.done && <p role="status">Muudatus on salvestatud.</p>}
  {query.failed && <p role="alert">Salvestamine ebaõnnestus. Proovi uuesti.</p>}
  <h2>Tasulise liidestusabi päringud</h2>
  {!requests.length && <section className="panel"><p>Avatud abipäringuid pole.</p></section>}
  {requests.map(item => <section className="panel" key={item.id} style={{ marginBottom: 18 }}>
   <h3>{item.companyName}</h3>
   <p><a className="text-link" href={item.shopUrl} rel="noopener noreferrer">{item.shopUrl}</a></p>
   <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.message}</p>
   <p>{new Intl.DateTimeFormat('et-EE', { timeZone: 'Europe/Tallinn' }).format(new Date(item.createdAt))}</p>
   <form action={closeHelp}>
    <input type="hidden" name="id" value={item.id} />
    <a className="button" href={`mailto:${item.email}?subject=${encodeURIComponent('LEEKi e-poe liidestusabi')}`}>Vasta e-postiga</a>{' '}
    <button className="button secondary">Märgi lahendatuks</button>
   </form>
  </section>)}
 </WorkspaceShell>;
}
