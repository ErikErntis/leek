import { requireDemoAccess } from '../../lib/preview-access';
import { WorkspaceShell } from '@leek/ui';
import { ContentTable } from '../../components/content';
export default function Page(){requireDemoAccess();return <WorkspaceShell kind="portal" active="/tookuulutused" siteUrl={process.env.SITE_URL}><div className="workspace-heading"><div><h1>Töökuulutused</h1><p>Sinu ettevõtte avaldatud sisu.</p></div></div><p className="notice-panel">See on sisu halduse eelvaade. Lisamine ja muutmine avaneb pärast turvalise sisselogimise ühendamist.</p><section className="panel"><ContentTable kind="jobs"/></section></WorkspaceShell>;}
