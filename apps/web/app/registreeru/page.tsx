import type { Metadata } from 'next';
import { AuthScreen } from '../../components/auth/auth-screen';
import { getPricingPlan } from '../../lib/pricing';

export const metadata: Metadata = { title: 'Loo konto', robots: { index: false, follow: false } };
export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <AuthScreen mode="register" selectedPlan={getPricingPlan(query.pakett)} />;
}
