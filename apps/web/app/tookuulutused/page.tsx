import { redirect } from 'next/navigation';
import { portalUrl } from '../../lib/portal-url';

export const metadata = { robots: { index: false, follow: false } };
export default function PortalRedirect() { redirect(portalUrl('/tookuulutused')); }
