'use client';

import { useState, type CSSProperties } from 'react';
import { ArrowRight, ArrowUpRight, Check, Flame, MoveUpRight, RotateCcw, Sparkles } from 'lucide-react';
import type { PricingPlan } from '../../lib/pricing';
import styles from './celebration.module.css';

// Deterministic positions keep server and client markup identical.
const confetti = Array.from({ length: 48 }, (_, index) => ({
  '--x': `${((index * 71) % 101) - 50}vw`,
  '--delay': `${(index % 9) * .055}s`,
  '--duration': `${2.5 + (index % 7) * .13}s`,
  '--turn': `${((index % 2 ? 1 : -1) * (240 + index * 31))}deg`,
  '--color': ['#fff064', '#005b63', '#83bfc0', '#ebd94b'][index % 4],
} as CSSProperties));

function CelebrationMark() {
  return <div className={styles.art} aria-hidden="true">
    <span className={styles.orbitOne} /><span className={styles.orbitTwo} />
    <svg className={styles.rays} viewBox="0 0 400 400" fill="none">
      {Array.from({ length: 12 }, (_, index) => <path key={index} d="M200 23V39" stroke="currentColor" strokeWidth="2" transform={`rotate(${index * 30} 200 200)`} />)}
    </svg>
    <span className={`${styles.spark} ${styles.sparkOne}`} /><span className={`${styles.spark} ${styles.sparkTwo}`} /><span className={`${styles.spark} ${styles.sparkThree}`} />
    <span className={styles.dotOne} /><span className={styles.dotTwo} />
    <div className={styles.seal}><Flame className={styles.flame} strokeWidth={1.25} /><span>LEEK</span><small>SIIT ALGAB KOOSTÖÖ</small></div>
    <span className={styles.check}><Check size={23} strokeWidth={2.5} /></span>
    <span className={styles.artCaption}>ÜKS TEGIJA. ROHKEM VÕIMALUSI.</span>
  </div>;
}

type CompanyCelebrationProps = {
  selectedPlan?: PricingPlan;
  companyName: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  reviewNote?: string | null;
};

export function CompanyCelebration({
  selectedPlan,
  companyName,
  status,
  reviewNote,
}: CompanyCelebrationProps) {
  const [celebration, setCelebration] = useState(0);
  return <div className={styles.page}>
    <div key={celebration} className={styles.confetti} aria-hidden="true">{confetti.map((style, index) => <i key={index} style={style} className={index % 3 === 0 ? styles.round : undefined} />)}</div>
    <section className={styles.hero} aria-labelledby="celebration-title">
      <div className={styles.topline}><span>LOODE-EESTI ETTEVÕTJATELE</span><span>UUS PEATÜKK <MoveUpRight size={13} aria-hidden="true" /></span></div>
      <div className={styles.heroGrid}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}><span /> SEE VÄÄRIB VÄIKEST TÄHISTAMIST</span>
          <h1 id="celebration-title"><span>Hea töö.</span><span>Siit algab</span><span className={styles.green}>koostöö<span className={styles.period}>.</span></span></h1>
          <p className={styles.lead}>Suured asjad algavad kohalikest tegijatest.<br />Ja sina oled üks neist.</p>
          <p className={styles.support}>Ettevõtte tutvustus on koos. Järgmine peatükk? Uued tutvused, ühised ideed ja rohkem võimalusi siinsamas, Loode-Eestis.</p>
          <div className={styles.actions}><a href="/ettevotted" className={styles.primary}>Avasta teisi tegijaid <ArrowRight size={18} aria-hidden="true" /></a><a href="/klubist" className={styles.secondary}>Tuttavaks LEEKiga <ArrowUpRight size={17} aria-hidden="true" /></a></div>
          <button className={styles.replay} type="button" onClick={() => setCelebration(value => value + 1)}><RotateCcw size={13} aria-hidden="true" />Veel üks säde</button>
        </div>
        <CelebrationMark />
      </div>
      <aside className={styles.preview}>
  <span className={styles.previewLabel}>
    {{
      draft: 'MUSTAND',
      pending: 'OOTAB KINNITAMIST',
      published: 'KINNITATUD',
      rejected: 'TAGASI LÜKATUD',
    }[status]}
  </span>

  <div>
    <p>
      <strong>{companyName}</strong>
      {status === 'draft' &&
        ' on salvestatud mustandina. Ettevõtet pole veel kinnitamiseks esitatud.'}
      {status === 'pending' &&
        ' on esitatud kinnitamiseks. LEEKi haldur vaatab ettevõtte andmed üle.'}
      {status === 'published' &&
        ' on kinnitatud ja avalikus kataloogis nähtav.'}
      {status === 'rejected' &&
        ' taotlus on tagasi lükatud. Vaata halduri tagasisidet.'}
    </p>

    {reviewNote && (
      <p>
        <strong>Halduri tagasiside:</strong> {reviewNote}
      </p>
    )}
  </div>
</aside>
    </section>
    <section className={styles.next} aria-labelledby="next-title">
      <div className={styles.nextInner}>
        <div className={styles.nextHeading}><span className={styles.kicker}>EDASI SAAB AINULT HUVITAVAMAKS</span><h2 id="next-title">Mis saab pärast<br />ettevõtte esitamist?</h2><p>Hea koostöö algab usaldusest. Seepärast vaatame iga liituva ettevõtte andmed üle.</p>{selectedPlan && <div className={styles.plan}><Sparkles size={16} aria-hidden="true" /><span>Sinu valik: <strong>{selectedPlan.name}</strong></span></div>}</div>
        <ol className={styles.timeline}>
          <li><span className={styles.number}>01</span><div><h3>Vaatame andmed üle.</h3><p>LEEKi haldur kontrollib ettevõtte andmeid ja tegutsemist Loode-Eestis.</p></div></li>
          <li><span className={styles.number}>02</span><div><h3>Saad ettevõtte kinnituse.</h3><p>Kui midagi vajab täpsustamist, võtame kontaktisikuga ühendust.</p></div></li>
          <li><span className={styles.number}>03</span><div><h3>Sinu ettevõte saab hoo sisse.</h3><p>Pärast kinnitamist saad jätkata valitud paketiga. Tasulise paketi eest tasumine toimub alles siis.</p></div></li>
        </ol>
      </div>
    </section>
    <div className={styles.signature}><Flame size={17} aria-hidden="true" /><span>KOHALIKUD TEGIJAD. ÜHISED VÕIMALUSED.</span></div>
  </div>;
}
