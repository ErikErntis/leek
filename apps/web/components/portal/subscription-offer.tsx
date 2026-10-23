'use client';

import { useRef, useState } from 'react';
import { ArrowRight, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { Brand } from '@leek/ui';
import type { Plan } from '@leek/contracts';
import type { PortalCompany, PortalData } from '../../lib/portal';
import { LogoutButton } from '../auth/logout-button';

export function SubscriptionOffer({ company, plans, available }: {
  company: PortalCompany;
  plans: PortalData['plans'];
  available: boolean;
}) {
  const preferred: Plan = company.preferredSubscription === 3 ? 'employer' : company.preferredSubscription === 2 ? 'visibility' : 'free';
  const [selected, setSelected] = useState<Plan>(preferred === 'free' ? 'visibility' : preferred);
  const [switching, setSwitching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const plan = plans.find(item => item.id === selected)!;

  async function activate(free: boolean) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const target = free ? 'free' : selected;
    try {
      const choice = await fetch(`/api/portal/company/${company.id}/plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: target }), signal: AbortSignal.timeout(20000),
      });
      if (!choice.ok) throw new Error((await choice.json()).error ?? 'Paketti ei saanud valida.');
      if (target === 'free') {
        window.location.assign(`/portaal?company=${company.id}`);
        return;
      }
      const checkout = await fetch(`/api/portal/company/${company.id}/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: target }), signal: AbortSignal.timeout(20000),
      });
      const result = await checkout.json();
      if (!checkout.ok) throw new Error(result.error ?? 'Maksmist ei saanud alustada.');
      const url = new URL(result.url);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Vigane makselink.');
      window.location.assign(url.toString());
    } catch (reason) {
      setError(reason instanceof Error && !['TypeError', 'TimeoutError'].includes(reason.name) ? reason.message : 'Ühendus ebaõnnestus. Proovi uuesti.');
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="subscription-offer">
      <header className="subscription-topbar"><Brand /><LogoutButton /></header>
      <main id="main" className="subscription-stage">
        <section className="subscription-intro" aria-labelledby="offer-title">
          <span className="subscription-approved"><ShieldCheck size={17} aria-hidden="true" /> ETTEVÕTE ON KINNITATUD</span>
          <p className="subscription-company">{company.name}</p>
          <h1 id="offer-title">{preferred === 'free' ? <>Proovi hoopis<br /><span>tasulist paketti.</span></> : <>Nüüd võib<br /><span>hoo sisse saada.</span></>}</h1>
          <p className="subscription-lead">{preferred === 'free' ? 'Anna oma ettevõttele rohkem võimalusi. Edendajaga saad lisada piiramatult teenuseid ja jälgida statistikat.' : 'Sinu ettevõte on valmis järgmisteks sammudeks. Aktiveeri soovitud pakett ja kasuta selle võimalusi.'}</p>
          <span className="subscription-signature">KOHALIKUD TEGIJAD. SUUREMAD VÕIMALUSED.</span>
        </section>
        <section className="subscription-card" aria-label="Paketi aktiveerimine" aria-busy={busy}>
          <div className="subscription-card-top"><span><Sparkles size={16} aria-hidden="true" />{preferred === 'free' ? 'SOOVITAME SULLE' : 'SINU PAKETIVALIK'}</span><button type="button" className="subscription-change" aria-expanded={switching} aria-controls="subscription-options" disabled={busy} onClick={() => setSwitching(value => !value)}>Vaheta paketti</button></div>
          <h2>{plan.name}</h2>
          <p className="subscription-price">{plan.amount / 100} € <span>/ aasta</span></p>
          <p className="subscription-price-note">{plan.id === 'free' ? 'Alusta tasuta ja muuda paketti hiljem.' : 'Ühekordne aastamakse. Automaatset pikenemist ei ole.'}</p>
          <ul className="subscription-benefits"><li><Check size={18} aria-hidden="true" />Ettevõtte profiil</li>{plan.features.filter(feature => feature !== 'Ettevõtte profiil').map(feature => <li key={feature}><Check size={18} aria-hidden="true" />{feature}</li>)}</ul>
          {switching && <div id="subscription-options" className="subscription-options" role="group" aria-label="Vali pakett">{plans.map(item => <button key={item.id} type="button" aria-pressed={selected === item.id} disabled={busy} onClick={() => setSelected(item.id)}><span>{item.name}</span><strong>{item.amount / 100} € / a</strong>{selected === item.id && <Check size={16} aria-hidden="true" />}</button>)}</div>}
          {error && <p className="subscription-error" role="alert">{error}</p>}
          {!available && selected !== 'free' && <p className="subscription-payment-note">Maksmine pole veel avatud. Praegu saad jätkata tasuta paketiga.</p>}
          <button className="subscription-activate" type="button" disabled={busy || (selected !== 'free' && !available)} onClick={() => activate(false)}>{busy ? 'Palun oota…' : selected === 'free' ? 'Alusta tasuta' : `Aktiveeri ${plan.name}`}<ArrowRight size={19} aria-hidden="true" /></button>
          <button className="subscription-free" type="button" disabled={busy} onClick={() => activate(true)}>{preferred === 'free' ? 'Jätka tasuta paketiga' : 'Jätka hoopis tasuta paketiga'}</button>
          <p className="subscription-footnote">Esialgsed hinnad. Tasulise paketi võimalused avanevad pärast makse kinnitamist.</p>
        </section>
      </main>
      <footer className="subscription-footer">Loode-Eesti ettevõtlusklubi · Koos on rohkem võimalik.</footer>
    </div>
  );
}
