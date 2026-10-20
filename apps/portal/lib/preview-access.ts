import { redirect } from 'next/navigation';

/** Temporary demo boundary. Replace with verified session checks in the next step. */
export function requireDemoAccess() {
  if (process.env.DEMO_MODE !== 'true') redirect('/logi-sisse');
}
