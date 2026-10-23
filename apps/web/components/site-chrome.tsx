'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/** One root document; portal routes render their own workspace navigation. */
export function SiteChrome({ children, header, footer }: {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const portal = pathname === '/portaal' || pathname.startsWith('/portaal/');
  if (portal) return <>{children}</>;
  return <>{header}<main id="main">{children}</main>{footer}</>;
}
