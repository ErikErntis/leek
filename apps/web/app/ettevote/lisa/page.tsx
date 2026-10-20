import type { Metadata } from 'next';
import { CompanyForm } from '../../../components/company/company-form';
import { getPricingPlan } from '../../../lib/pricing';
import { requireCompanyOnboardingAccess } from '../../../lib/company-access';

export const metadata: Metadata = { title: 'Lisa ettevõte', robots: { index: false, follow: false } };

export default async function AddCompanyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const selectedPlan = getPricingPlan(query.pakett);
  await requireCompanyOnboardingAccess(selectedPlan?.id);
  return <CompanyForm selectedPlan={selectedPlan} />;
}
