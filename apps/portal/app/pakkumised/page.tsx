import {portalData} from '../../lib/portal';
import {PortalShell} from '../../components/portal-shell';
export default async function Page(){const data=await portalData();const company=data.companies[0];return <PortalShell company={company} active="/pakkumised"><section className="panel"><h1>Teenused ja pakkumised</h1><p>See osa avaneb järgmises etapis.</p><a className="text-link" href="/">Tagasi ülevaatesse →</a></section></PortalShell>;}
