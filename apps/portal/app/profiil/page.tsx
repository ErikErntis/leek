import {portalData} from '../../lib/portal';
import {PortalShell} from '../../components/portal-shell';
export default async function Page(){const data=await portalData();const company=data.companies[0];return <PortalShell company={company} active="/profiil"><section className="panel"><h1>Ettevõtte profiil</h1><p>See osa avaneb järgmises etapis.</p><a className="text-link" href="/">Tagasi ülevaatesse →</a></section></PortalShell>;}
