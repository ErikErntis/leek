import type { Metadata } from 'next';
import { CompanyCelebration } from '../../../components/company/company-celebration';
import { requireCompanyOnboardingAccess } from '../../../lib/company-access';
import { getPricingPlan } from '../../../lib/pricing';

export const metadata: Metadata = { title: 'Hea töö. Siit algab koostöö.', robots: { index: false, follow: false } };

export default async function CompanyCompletePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const selectedPlan = getPricingPlan((await searchParams).pakett);
  await requireCompanyOnboardingAccess(selectedPlan?.id);
  return <CompanyCelebration selectedPlan={selectedPlan} />;
}
