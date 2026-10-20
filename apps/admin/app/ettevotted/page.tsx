import { WorkspaceShell } from '@leek/ui';
import { CompaniesTable } from '../../components/companies';
export default function Companies(){return <WorkspaceShell kind="admin" active="/ettevotted" siteUrl={process.env.SITE_URL}><div className="workspace-heading"><div><h1>Ettevõtted</h1><p>Piirkonna ettevõtete kataloogi ülevaade.</p></div></div><section className="panel"><CompaniesTable/></section></WorkspaceShell>;}
