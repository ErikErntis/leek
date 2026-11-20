import { getSiteContent } from '../lib/site-content';
import { ArrowRight, LogIn, Menu, MessageCircle } from 'lucide-react';
import { Brand } from '@leek/ui';
import styles from './site-header.module.css';
import { getSession } from '../lib/session';
import { customerInboxPath } from '../lib/inquiry-links';
import { LogoutButton } from './auth/logout-button';

/** One shared public header, including the signup/login pages. */
export async function SiteHeader() {
  // A temporary auth outage must not break public directory pages.
  const [session, content] = await Promise.all([getSession().catch(() => null), getSiteContent()]);
  const links = [
    [content.navCompanies, '/ettevotted'],
    [content.navServices, '/teenused'],
    [content.navProducts, '/tooted'],
    [content.navOffers, '/pakkumised'],
    [content.navJobs, '/tookohad'],
    [content.navPlans, '/liitu'],
    [content.navAbout, '/klubist'],
  ] as const;
  return (
    <header className="site-header">
      <div className="container nav">
        <Brand />
        <nav className={`desktop-nav ${styles.links}`} aria-label="Põhinavigatsioon">
          {links.map(([title, href]) => <a href={href} key={href}>{title}</a>)}
        </nav>
        <div className={styles.actions}>
          {session ? <><a href={customerInboxPath} className={styles.login} aria-label="Minu päringud"><MessageCircle size={17} aria-hidden="true" /><span>Minu päringud</span></a><a href="/portaal" className={styles.join}>Minu ettevõte <ArrowRight size={16} aria-hidden="true" /></a><LogoutButton /></> : <>
          <a href="/logi-sisse" className={styles.login} aria-label="Logi sisse">
            <LogIn size={17} aria-hidden="true" />
            <span>Logi sisse</span>
          </a>
          <a href="/liitu" className={styles.join}>
            Liitu <ArrowRight size={16} aria-hidden="true" />
          </a>
          </>}
        </div>
        <details className={`mobile-nav ${styles.mobile}`}>
          <summary aria-label="Ava menüü"><Menu aria-hidden="true" /></summary>
          <nav aria-label="Mobiilinavigatsioon">
            {links.map(([title, href]) => <a href={href} key={href}>{title}</a>)}
            {session ? <><a href={customerInboxPath}>Minu päringud</a><a href="/portaal">Minu ettevõte</a><LogoutButton /></> : <><a href="/logi-sisse">Logi sisse</a><a href="/liitu">Liitu LEEKiga</a></>}
          </nav>
        </details>
      </div>
    </header>
  );
}
