import type { Metadata } from 'next';
import { CompanyCelebration } from '../../../components/company/company-celebration';
import { requireCompanyOnboardingAccess } from '../../../lib/company-access';
import { getOwnCompany } from '../../../lib/company-api';
import { notFound } from 'next/navigation';
import { getPricingPlan } from '../../../lib/pricing';

export const metadata: Metadata = { title: 'Hea töö. Siit algab koostöö.', robots: { index: false, follow: false } };

export default async function CompanyCompletePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireCompanyOnboardingAccess();
  const id = (await searchParams).id;
  if (typeof id !== 'string') notFound();
  const company = await getOwnCompany(id);
  return <CompanyCelebration selectedPlan={getPricingPlan(company.requestedPlan)} companyName={company.name} status={company.status} reviewNote={company.reviewNote} />;
}
