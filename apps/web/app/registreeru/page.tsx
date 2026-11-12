import { inquiryAuthDestination } from '../../lib/auth-destination';
import { redirect } from 'next/navigation';
import { getSession } from '../../lib/session';
import type { Metadata } from 'next';
import { AuthScreen } from '../../components/auth/auth-screen';
import { getPricingPlan } from '../../lib/pricing';

export const metadata: Metadata = { title: 'Loo konto', robots: { index: false, follow: false } };
export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const plan = getPricingPlan(query.pakett);
  const nextPath = inquiryAuthDestination(query.next);
  if (await getSession()) redirect(nextPath ?? (plan ? `/ettevote/lisa?pakett=${encodeURIComponent(plan.id)}` : '/ettevote/lisa'));
  return <AuthScreen mode="register" selectedPlan={plan} nextPath={nextPath} />;
}
