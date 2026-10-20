import { Building2, MapPin, Users } from 'lucide-react';
import { AuthForm } from './auth-form';
import type { AuthMode } from './validation';
import { RegionNotice } from '../region-notice';
import { formatAnnualPrice, type PricingPlan } from '../../lib/pricing';
import styles from './auth.module.css';

export function AuthScreen({ mode, selectedPlan }: { mode: AuthMode; selectedPlan?: PricingPlan }) {
  const register = mode === 'register';

  return (
    <div className={styles.page}>
      <div className={styles.main}>
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
          {selectedPlan && (
            <aside className={styles.planChoice} aria-label="Valitud ettevõttepakett">
              <div className={styles.planChoiceRow}>
                <div><span>Valitud ettevõttepakett</span><strong>{selectedPlan.name}</strong></div>
                <div><strong>{formatAnnualPrice(selectedPlan.annualPrice)} <small>/ aastas</small></strong><span>Esialgne hind</span></div>
              </div>
              <div className={styles.planChoiceBottom}><span>Konto loomine on tasuta.</span><a href="/liitu#paketid">Muuda paketti →</a></div>
            </aside>
          )}
          {register && <RegionNotice compact />}
          <AuthForm key={`${mode}:${selectedPlan?.id ?? 'none'}`} mode={mode} selectedPlanId={selectedPlan?.id} />
        </section>
      </div>


    </div>
  );
}
