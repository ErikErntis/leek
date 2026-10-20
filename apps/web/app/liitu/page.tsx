import type { Metadata } from 'next';
import { ArrowRight, Check, Flame, Minus, Sprout, TrendingUp } from 'lucide-react';
import { RegionNotice } from '../../components/region-notice';
import { formatAnnualPrice, pricingPlans, registrationHref, type PricingPlan } from '../../lib/pricing';
import styles from './pricing.module.css';

export const metadata: Metadata = {
  title: 'Paketid ja liitumine',
  description: 'Leia oma Loode-Eestis tegutsevale ettevõttele sobiv LEEKi pakett. Konto loomine on kõigile tasuta.',
  alternates: { canonical: '/liitu' },
};

const icons = { free: Sprout, visibility: TrendingUp, employer: Flame };

function features(plan: PricingPlan) {
  return [
    'Ettevõtte registreerimine ja profiil',
    plan.serviceLimit === 1 ? 'Ühe teenuse lisamine' : 'Piiramatu arv teenuseid',
    ...(plan.statistics ? ['Statistika jälgimine'] : []),
    ...(plan.jobListings ? ['Töökuulutuste lisamine'] : []),
    ...(plan.eventListings ? ['Üritusekuulutuste lisamine'] : []),
    ...(plan.featured ? ['Ettevõtte esiletõstmine'] : []),
  ];
}

function Availability({ included }: { included: boolean }) {
  return included
    ? <span className={styles.availability}><Check size={18} aria-hidden="true" /><span className={styles.srOnly}>Sisaldub</span></span>
    : <span className={styles.unavailable}><Minus size={17} aria-hidden="true" /><span className={styles.srOnly}>Ei sisaldu</span></span>;
}

export default function JoinPage() {
  return (
    <div className={`container ${styles.page}`}>
      <section className={styles.intro} aria-labelledby="pricing-title">
        <span className={styles.eyebrow}>KOHALIKULE ETTEVÕTTELE</span>
        <h1 id="pricing-title">Sinu ettevõttele<br />sobiv kasvuruum.</h1>
        <p>Alusta ühest teenusest või too välja kõik oma võimalused. Leia pakett, mis sobib sinu ettevõtte järgmise sammuga.</p>
        <div className={styles.accountLine}>
          <span>Konto loomine on kõigile tasuta.</span>
          <a href="/registreeru">Loo konto paketti valimata <ArrowRight size={14} aria-hidden="true" /></a>
        </div>
      </section>

      <RegionNotice />

      <section id="paketid" className={styles.cardsSection} aria-label="Aastapaketid">
        <div className={styles.priceNote}>
          <span>AASTAPAKETID · ETTEVÕTTE KOHTA</span>
          <span className={styles.draftBadge}>Esialgsed hinnad</span>
        </div>
        <p className={styles.paymentNote}>Paketti saad jooksvalt vahetada. Tasulise paketi eest tasumine toimub pärast ettevõtte konto kinnitamist.</p>
        <div className={styles.cards}>
          {pricingPlans.map(plan => {
            const Icon = icons[plan.id];
            return (
              <article key={plan.id} className={`${styles.card} ${plan.highlighted ? styles.highlighted : ''}`}>
                <div className={styles.cardTop}><span className={styles.planIcon}><Icon size={23} aria-hidden="true" /></span><span>{plan.tagline}</span></div>
                <h2>{plan.name}</h2>
                <p className={styles.description}>{plan.description}</p>
                <div className={styles.price}><strong>{formatAnnualPrice(plan.annualPrice)}</strong><span>/ aastas</span></div>
                <p className={styles.perCompany}>Ühele ettevõttele</p>
                <a href={registrationHref(plan)} className={`${styles.cta} ${plan.highlighted ? styles.primary : ''}`}>
                  {plan.cta} <ArrowRight size={17} aria-hidden="true" />
                </a>
                <ul className={styles.features}>
                  {features(plan).map(feature => <li key={feature}><Check size={15} aria-hidden="true" /><span>{feature}</span></li>)}
                </ul>
              </article>
            );
          })}
        </div>
        <p className={styles.provisional}>Kuvatud hinnad ja pakettide võimalused on esialgsed ning võivad enne teenuse avamist muutuda.</p>
      </section>

      <section className={styles.comparison} aria-labelledby="comparison-title">
        <div className={styles.comparisonHeading}><h2 id="comparison-title">Võrdle võimalusi</h2><p>Üks konto. Sinu ettevõttele sobiv pakett.</p></div>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Pakettide võrdlus; väiksel ekraanil horisontaalselt keritav">
          <table className={styles.table}>
            <caption className={styles.srOnly}>LEEKi ettevõttepakettide hinnad ja võimalused</caption>
            <thead><tr><th scope="col">Võimalus</th>{pricingPlans.map(plan => <th scope="col" key={plan.id}>{plan.name}<small>{formatAnnualPrice(plan.annualPrice)} / aastas</small></th>)}</tr></thead>
            <tbody>
              <tr><th scope="row">Ettevõtte registreerimine ja profiil</th>{pricingPlans.map(plan => <td key={plan.id}><Availability included /></td>)}</tr>
              <tr><th scope="row">Teenuste lisamine</th>{pricingPlans.map(plan => <td key={plan.id}>{plan.serviceLimit === null ? 'Piiramatult' : `${plan.serviceLimit} teenus`}</td>)}</tr>
              {([
                ['statistics', 'Statistika jälgimine'],
                ['jobListings', 'Töökuulutuste lisamine'],
                ['eventListings', 'Üritusekuulutuste lisamine'],
                ['featured', 'Ettevõtte esiletõstmine'],
              ] as const).map(([feature, label]) => <tr key={feature}><th scope="row">{label}</th>{pricingPlans.map(plan => <td key={plan.id}><Availability included={plan[feature]} /></td>)}</tr>)}
            </tbody>
          </table>
        </div>
        <p className={styles.bottomNote}>Pakett kuulub ettevõttele. Konto saad luua ka enne paketi valimist.</p>
      </section>
    </div>
  );
}
