import type { Metadata } from 'next';
import { AuthScreen } from '../../components/auth/auth-screen';
import { getPricingPlan } from '../../lib/pricing';

export const metadata: Metadata = { title: 'Logi sisse', robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <AuthScreen mode="login" selectedPlan={getPricingPlan(query.pakett)} />;
}
