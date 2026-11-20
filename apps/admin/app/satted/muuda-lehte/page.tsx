import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { WorkspaceShell } from '@leek/ui';
import { siteContentSchema, type SiteContentDocument } from '@leek/contracts';
import { SiteContentEditor } from '../../../components/site-content-editor';
import './editor.css';

export const metadata = { title: 'Muuda lehte' };

export default async function EditSite() {
 const response = await fetch(new URL('/v1/admin/site-content', process.env.API_URL), {
  headers: { cookie: (await headers()).get('cookie') ?? '' }, cache: 'no-store', signal: AbortSignal.timeout(10000),
 });
 if (response.status === 401) redirect('/logi-sisse');
 if (response.status === 403) redirect('/puudub-ligipaas');
 if (!response.ok) throw new Error('Lehe sisu ei saanud laadida.');
 const initial = await response.json() as SiteContentDocument;
 initial.content = siteContentSchema.parse(initial.content);
 return <WorkspaceShell kind="admin" active="/satted" demo={false} siteUrl={process.env.SITE_URL}>
  <a className="text-link" href="/satted">← Sätted</a>
  <div className="workspace-heading"><div><h1>Muuda lehte</h1><p>Salvestatud muudatused ilmuvad kohe avalikul lehel.</p></div></div>
  <SiteContentEditor initial={initial} siteUrl={process.env.SITE_URL ?? 'http://localhost:3000'} />
 </WorkspaceShell>;
}
