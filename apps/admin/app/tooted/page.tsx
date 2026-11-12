import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { WorkspaceShell } from '@leek/ui';
import { formatServicePrice, productAvailability, reviewDecisionSchema, type CompanyProduct, type ProductHelp } from '@leek/contracts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tooted ja liidestusabi', robots: { index: false, follow: false } };

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
async function decide(form: FormData) {
 'use server';
 const id = String(form.get('id') ?? '');
 const version = Number(form.get('version'));
 const parsed = reviewDecisionSchema.safeParse({ decision: form.get('decision'), note: form.get('note') });
 if (!uuid.test(id) || !Number.isSafeInteger(version) || version < 0 || !parsed.success) redirect('/tooted?invalid=1');
 const response = await api(`/v1/admin/products/${id}/review`, { ...parsed.data, version });
 if (response.status === 409) redirect('/tooted?changed=1');
 redirect(response.ok ? '/tooted?done=1' : '/tooted?failed=1');
}

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
 const { items, requests } = await response.json() as { items: { product: CompanyProduct; companyName: string }[]; requests: ProductHelp[] };
 return <WorkspaceShell kind="admin" active="/tooted" demo={false} siteUrl={process.env.SITE_URL}>
  <div className="workspace-heading"><div><h1>Tooted ja liidestusabi</h1></div></div>
  {query.done && <p role="status">Muudatus on salvestatud.</p>}
  {query.invalid && <p role="alert">Tagasilükkamisel lisa vähemalt 5 märgi pikkune põhjus.</p>}
  {query.changed && <p role="alert">Toode muutus vahepeal. Vaata värskendatud andmed üle.</p>}
  {query.failed && <p role="alert">Salvestamine ebaõnnestus. Proovi uuesti.</p>}
  <h2>Ülevaatust ootavad tooted</h2>
  {!items.length && <section className="panel"><p>Ülevaatust ootavaid tooteid pole.</p></section>}
  {items.map(({ product, companyName }) => <section className="panel" key={product.id} style={{ marginBottom: 18 }}>
   <h3>{product.content.title}</h3>
   <p>{companyName} · {product.content.category}{product.shopId && ' · E-poest'}</p>
   <p>{product.content.priceCents === null ? 'Hind määramata' : formatServicePrice(product.content.priceCents)} · {productAvailability[product.content.availability]}</p>
   {product.content.shopUrl && <p><a className="text-link" href={product.content.shopUrl} rel="noopener noreferrer">Vaata toodet e-poes</a></p>}
   {product.content.variants.length > 0 && <ul>{product.content.variants.map(item => <li key={item.id}>
    {item.name} · {item.priceCents === null ? 'Hind määramata' : formatServicePrice(item.priceCents)} · {productAvailability[item.availability]}
   </li>)}</ul>}
   <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{product.content.photos.map((photo, index) => <img key={`${photo}-${index}`}
    src={photo} width={160} height={100} loading="lazy" referrerPolicy="no-referrer" style={{ objectFit: 'contain' }} alt={`Esitatud toote pilt ${index + 1}`} />)}</div>
   <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{product.content.description}</p>
   <form action={decide}>
    <input type="hidden" name="id" value={product.id} /><input type="hidden" name="version" value={product.version} />
    <label>Halduri märkus<textarea name="note" maxLength={1000} rows={2} style={{ display: 'block', width: '100%', margin: '10px 0' }} /></label>
    <button className="button" name="decision" value="approve">Kinnita toode</button>{' '}
    <button className="button secondary" name="decision" value="reject">Lükka tagasi</button>
   </form>
  </section>)}
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
