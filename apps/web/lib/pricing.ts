import type { Plan } from '@leek/contracts';

export type PricingPlan = {
  id: Plan;
  name: string;
  annualPrice: number;
  tagline: string;
  description: string;
  serviceLimit: number | null;
  statistics: boolean;
  jobListings: boolean;
  eventListings: boolean;
  featured: boolean;
  highlighted?: boolean;
  cta: string;
};

/** Temporary presentation data. Admin-managed pricing will replace this source later. */
export const pricingPlans: readonly PricingPlan[] = [
  {
    id: 'free',
    name: 'Alustaja',
    annualPrice: 0,
    tagline: 'ESIMENE SAMM',
    description: 'Ole oma kodukandis leitav ja tutvusta oma esimest teenust.',
    serviceLimit: 1,
    statistics: false,
    jobListings: false,
    eventListings: false,
    featured: false,
    cta: 'Alusta tasuta',
  },
  {
    id: 'visibility',
    name: 'Edendaja',
    annualPrice: 50,
    tagline: 'ROHKEM VÕIMALUSI',
    description: 'Too välja kõik oma teenused ja hoia nähtavusel silma peal.',
    serviceLimit: null,
    statistics: true,
    jobListings: false,
    eventListings: false,
    featured: false,
    highlighted: true,
    cta: 'Vali Kasvaja',
  },
  {
    id: 'employer',
    name: 'Eestvedaja',
    annualPrice: 150,
    tagline: 'SUUREM NÄHTAVUS',
    description: 'Leia inimesi, jaga sündmusi ja paista piirkonnas rohkem silma.',
    serviceLimit: null,
    statistics: true,
    jobListings: true,
    eventListings: true,
    featured: true,
    cta: 'Vali Eestvedaja',
  },
];

export function getPricingPlan(value: unknown): PricingPlan | undefined {
  return typeof value === 'string' ? pricingPlans.find(plan => plan.id === value) : undefined;
}

export function formatAnnualPrice(price: number) {
  return new Intl.NumberFormat('et-EE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(price);
}

export function registrationHref(plan: PricingPlan) {
  return `/registreeru?pakett=${encodeURIComponent(plan.id)}`;
}
