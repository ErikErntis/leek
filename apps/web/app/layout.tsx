import type { Metadata } from 'next';
import { Footer, DemoNotice } from '@leek/ui';
import '@leek/ui/styles.css';
import './theme.css';
import { SiteHeader } from '../components/site-header';
import { siteUrl } from '../lib/data';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'LEEK — Koos kasvab Loode-Eesti', template: '%s | LEEK' },
  description: 'Avasta Loode-Eesti ettevõtted, kohalikud teenused, pakkumised ja töökohad. LEEK ühendab piirkonna tegijad.',
  robots: process.env.DEMO_MODE === 'true' ? { index: false, follow: false } : { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'et_EE',
    siteName: 'LEEK',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et">
      <body>
        <a href="#main" className="skip-link">Liigu põhisisu juurde</a>
        {process.env.DEMO_MODE === 'true' && <DemoNotice />}
        <SiteHeader />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
