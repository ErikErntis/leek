import { WorkspaceShell } from '@leek/ui';
import { ShieldCheck } from 'lucide-react';
export default function Review(){return <WorkspaceShell kind="admin" active="/ulevaatus" siteUrl={process.env.SITE_URL}><div className="workspace-heading"><div><h1>Sisu ülevaatus</h1><p>Ettevõtete esitatud sisu enne avaldamist.</p></div></div><section className="empty-state"><ShieldCheck size={40}/><h2>Ülevaatuse järjekord on tühi</h2><p>Demoversioonis kinnitamist ootavat sisu ei ole.</p></section></WorkspaceShell>;}
