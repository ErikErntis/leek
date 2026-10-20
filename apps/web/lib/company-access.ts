import 'server-only';
import { redirect } from 'next/navigation';
import type { Plan } from '@leek/contracts';

/** Fail closed until server-verified authentication is connected.
 * Demo preview is available only through the local development server.
 * Never authorize a future company-write endpoint using this preview exception.
 */
export function requireCompanyOnboardingAccess(selectedPlanId?: Plan) {
  if (process.env.NODE_ENV === 'development' && process.env.DEMO_MODE === 'true') return;
  const query = selectedPlanId ? `?pakett=${encodeURIComponent(selectedPlanId)}` : '';
  redirect(`/logi-sisse${query}`);
}
