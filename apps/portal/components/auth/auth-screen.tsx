import { ArrowLeft, ArrowUpRight, Building2, MapPin, Users } from 'lucide-react';
import { Brand } from '@leek/ui';
import { AuthForm } from './auth-form';
import type { AuthMode } from './validation';
import styles from './auth.module.css';

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const siteUrl = process.env.SITE_URL || '/';
  const register = mode === 'register';

  return (
    <div className={styles.page}>
      <a href="#auth-form" className="skip-link">Liigu vormi juurde</a>
      <header className={styles.header}>
        <Brand href={siteUrl} />
        <a href={siteUrl} className={styles.backLink}>
          <ArrowLeft size={15} aria-hidden="true" /> Tagasi veebile
        </a>
      </header>

      <main className={styles.main}>
        <section className={styles.intro} aria-label="LEEKi iseteenindus">
          <span className={styles.eyebrow}>LOODE-EESTI ETTEVÕTJALE</span>
          <h2>Hea koostöö<br />algab <span>lähedalt.</span></h2>
          <p className={styles.introText}>
            Sinu ettevõte. Sinu kodukant. Uued võimalused inimestega, kes on siinsamas.
          </p>
          <div className={styles.features}>
            <div><Building2 size={21} aria-hidden="true" /><span>Tee oma ettevõte nähtavaks.</span></div>
            <div><Users size={21} aria-hidden="true" /><span>Leia uusi koostööpartnereid.</span></div>
            <div><MapPin size={21} aria-hidden="true" /><span>Kasva koos oma piirkonnaga.</span></div>
          </div>
          <div className={styles.signature}>
            <span /> KOHALIKUD TEGIJAD. ÜHISED VÕIMALUSED.
          </div>
        </section>

        <section className={styles.formPanel} aria-labelledby="auth-title">
          <span className={styles.formEyebrow}>LEEKI ISETEENINDUS</span>
          <h1 id="auth-title">{register ? 'Tere tulemast meie sekka.' : 'Hea sind jälle näha.'}</h1>
          <p className={styles.formIntro}>
            {register
              ? 'Alusta oma kontost. Ettevõtte andmed saad lisada järgmise sammuna.'
              : 'Logi sisse, et oma ettevõtte tegemistel silma peal hoida.'}
          </p>
          <div className={styles.previewNote}>
            <span className={styles.previewDot} aria-hidden="true" />
            <span><strong>Vormi eelvaade.</strong> Andmeid ei saadeta ega salvestata.</span>
          </div>
          <AuthForm key={mode} mode={mode} />
        </section>
      </main>

      <footer className={styles.footer}>
        <span>LEEK · Loode-Eesti ettevõtlusklubi</span>
        <a href={siteUrl}>Koos kasvab Loode-Eesti. <ArrowUpRight size={13} aria-hidden="true" /></a>
      </footer>
    </div>
  );
}
