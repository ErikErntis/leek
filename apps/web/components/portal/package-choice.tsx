'use client';

import { useRef, useState } from 'react';
import type { Plan } from '@leek/contracts';
import type { PortalCompany, PortalData } from '../../lib/portal';

/** Regular package management, after the first subscription decision. */
export function PackageChoice({ company, plans, available }: {
  company: PortalCompany;
  plans: PortalData['plans'];
  available: boolean;
}) {
  const [selected, setSelected] = useState<Plan>(company.requestedPlan);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  async function act(checkout: boolean, plan: Plan) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await fetch(`/api/portal/company/${company.id}/plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }), signal: AbortSignal.timeout(20000),
      });
      if (!result.ok) throw new Error((await result.json()).error ?? 'Paketti ei saanud muuta.');
      if (checkout) {
        const response = await fetch(`/api/portal/company/${company.id}/checkout`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan }), signal: AbortSignal.timeout(20000),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Maksmist ei saanud alustada.');
        const url = new URL(data.url);
        if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Vigane makselink.');
        window.location.assign(url.toString());
      } else {
        window.location.assign(`/portaal?company=${company.id}`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Proovi uuesti.');
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="package-choice">
      <div className="plans" role="group" aria-label="Vali ettevõtte pakett">
        {plans.map(plan => (
          <button type="button" key={plan.id} className={`plan-card package-card ${selected === plan.id ? 'selected' : ''}`} aria-pressed={selected === plan.id} onClick={() => setSelected(plan.id)} disabled={busy}>
            <span className="eyebrow">{plan.id === 'free' ? 'HEA ALGUS' : plan.id === 'visibility' ? 'ROHKEM VÕIMALUSI' : 'SUUREM NÄHTAVUS'}</span>
            <h2>{plan.name}</h2>
            <p className="package-price">{plan.amount / 100} € <small>/ aasta</small></p>
            <ul>{plan.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
            <span>{selected === plan.id ? '✓ Valitud' : 'Vali pakett'}</span>
          </button>
        ))}
      </div>
      <p className="muted">Esialgsed aastahinnad. Ühekordne makse, automaatset pikenemist ei ole.</p>
      {!available && <p>Maksmine pole veel avatud. Seni saad kasutada tasuta paketti.</p>}
      {error && <p role="alert" className="package-error">{error}</p>}
      <div className="package-actions">
        <button type="button" className="button" disabled={busy} onClick={() => act(selected !== 'free' && available, selected)}>{busy ? 'Palun oota…' : selected === 'free' ? 'Vali tasuta pakett' : available ? 'Aktiveeri pakett' : 'Salvesta paketivalik'}</button>
        <button type="button" className="button secondary" disabled={busy} onClick={() => act(false, 'free')}>Jätka tasuta paketiga</button>
      </div>
      <p className="muted">Tasulised võimalused avanevad pärast makse kinnitamist.</p>
    </section>
  );
}
