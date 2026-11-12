import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { WorkspaceShell } from '@leek/ui';
import { formatServicePrice, reviewDecisionSchema, type CompanyService } from '@leek/contracts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Teenuste ülevaatus', robots: { index: false, follow: false } };

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

async function decide(form: FormData) {
 'use server';
 const id = String(form.get('id') ?? '');
 const version = Number(form.get('version'));
 const parsed = reviewDecisionSchema.safeParse({ decision: form.get('decision'), note: form.get('note') });
 if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) || !Number.isSafeInteger(version) || version < 0 || !parsed.success) redirect('/teenused?invalid=1');
 const response = await api(`/v1/admin/services/${id}/review`, { ...parsed.data, version });
 if (response.status === 409) redirect('/teenused?changed=1');
 if (!response.ok) redirect('/teenused?failed=1');
 redirect('/teenused?done=1');
}

export default async function ServiceReviews({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
 const [query, response] = await Promise.all([searchParams, api('/v1/admin/services')]);
 if (!response.ok) throw new Error('Teenuste järjekorda ei saanud laadida.');
 const { items } = await response.json() as { items: { listing: CompanyService; companyName: string }[] };
 return <WorkspaceShell kind="admin" active="/teenused" demo={false} siteUrl={process.env.SITE_URL}>
  <div className="workspace-heading"><div><h1>Teenuste ülevaatus</h1><p>Kinnitatud teenused ilmuvad ettevõtte profiilil ja teenuste kataloogis.</p></div></div>
  {query.done && <p role="status">Otsus on salvestatud.</p>}
  {query.invalid && <p role="alert">Tagasilükkamisel lisa vähemalt 5 märgi pikkune põhjus.</p>}
  {query.changed && <p role="alert">Teenus muutus vahepeal. Vaata värskendatud andmed üle.</p>}
  {query.failed && <p role="alert">Otsuse salvestamine ebaõnnestus. Proovi uuesti.</p>}
  {!items.length && <section className="panel"><p>Ülevaatust ootavaid teenuseid pole.</p></section>}
  {items.map(({ listing, companyName }) => <section className="panel" key={listing.id} style={{ marginBottom: 18 }}>
   <h2>{listing.content.title}</h2>
   <p>{companyName} · {listing.content.category} · {listing.content.area}</p>
   <p><strong>{listing.content.priceCents === null ? 'Pakkumise alusel' : formatServicePrice(listing.content.priceCents)}</strong></p>
   {listing.content.photo && <img src={listing.content.photo} width={260} height={146} style={{ objectFit: 'contain' }} alt="Esitatud teenuse foto" />}
   <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{listing.content.description}</p>
   {listing.published && <p>Varasem kinnitatud versioon on {listing.visible ? 'avalik' : 'peidetud'}.</p>}
   <form action={decide}>
    <input type="hidden" name="id" value={listing.id} />
    <input type="hidden" name="version" value={listing.version} />
    <label>Halduri märkus<textarea name="note" maxLength={1000} rows={2} style={{ display: 'block', width: '100%', margin: '10px 0' }} /></label>
    <button className="button" name="decision" value="approve">Kinnita teenus</button>{' '}
    <button className="button secondary" name="decision" value="reject">Lükka tagasi</button>
   </form>
  </section>)}
 </WorkspaceShell>;
}
