import 'server-only';
import { redirect } from 'next/navigation';
import type { Plan } from '@leek/contracts';
import { getSession } from './session';

/** No demo bypass. Future writes must independently verify the API session. */
export async function requireCompanyOnboardingAccess(selectedPlanId?: Plan) {
  const session = await getSession();
  if (session) return session;
  const query = selectedPlanId ? `?pakett=${encodeURIComponent(selectedPlanId)}` : '';
  redirect(`/logi-sisse${query}`);
}
