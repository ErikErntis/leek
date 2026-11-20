import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { WorkspaceShell } from '@leek/ui';

export const metadata = { title: 'Sätted' };
export default async function Settings() {
 const response = await fetch(new URL('/v1/admin/access', process.env.API_URL), {
  headers: { cookie: (await headers()).get('cookie') ?? '' }, cache: 'no-store', signal: AbortSignal.timeout(10000),
 });
 if (response.status === 401) redirect('/logi-sisse');
 if (response.status === 403) redirect('/puudub-ligipaas');
 if (!response.ok) throw new Error('Sätteid ei saanud laadida.');
 return <WorkspaceShell kind="admin" active="/satted" demo={false} siteUrl={process.env.SITE_URL}>
  <div className="workspace-heading"><h1>Sätted</h1></div>
  <section className="panel">
   <h2>Lehe sisu</h2><p>Muuda avalehe tekste, pilte, nuppe ja avalike rubriikide tutvustusi.</p>
   <a className="button" href="/satted/muuda-lehte">Muuda lehte</a>
  </section>
 </WorkspaceShell>;
}
