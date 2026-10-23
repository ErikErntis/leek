import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '../../lib/session';
import './portal.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: { default: 'Ettevõtte portaal | LEEK', template: '%s | LEEKi portaal' },
  robots: { index: false, follow: false },
};
export default async function PortalLayout({ children }: { children: ReactNode }) {
  if (!await getSession()) redirect('/logi-sisse?next=%2Fportaal');
  return children;
}
