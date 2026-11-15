import { authDestination } from '../../lib/auth-destination';
import { redirect } from 'next/navigation';
import { getSession } from '../../lib/session';
import type { Metadata } from 'next';
import { AuthScreen } from '../../components/auth/auth-screen';
import { customerInboxPath } from '../../lib/inquiry-links';
import { getPricingPlan } from '../../lib/pricing';

export const metadata: Metadata = { title: 'Logi sisse', robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const plan = getPricingPlan(query.pakett);
  const nextPath = authDestination(query.next ?? (plan ? '/portaal' : customerInboxPath));
  if (await getSession()) redirect(nextPath);
  return <AuthScreen mode="login" selectedPlan={plan} nextPath={nextPath} />;
}
