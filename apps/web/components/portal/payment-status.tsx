'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function PaymentStatus({ checkFailed = false }: { checkFailed?: boolean }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [refreshing, startTransition] = useTransition();
  const stopped = attempts >= 12;

  function refresh() {
    startTransition(() => router.refresh());
  }

  useEffect(() => {
    if (stopped || refreshing) return;
    const timer = window.setTimeout(() => {
      setAttempts(value => value + 1);
      startTransition(() => router.refresh());
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [attempts, refreshing, router, stopped]);

  return <section className="panel" role="status" aria-live="polite" aria-busy={refreshing}>
    <h2>{stopped ? 'Makse kinnitamine võtab kauem aega.' : 'Kontrollime makse kinnitust.'}</h2>
    <p>{checkFailed ? 'Makse staatust ei õnnestunud praegu kontrollida. Proovi mõne hetke pärast uuesti.' : stopped ? 'Kui makse on Stripe’is õnnestunud, aga pakett ei aktiveeru, võta ühendust LEEKi halduriga.' : 'Kontrollime makset automaatselt. Kinnitatud makse järel avaneb sinu pakett.'} Uuesti maksta ei ole vaja.</p>
    <button type="button" className="button secondary" disabled={refreshing} onClick={() => { setAttempts(0); refresh(); }}>{refreshing ? 'Kontrollin…' : 'Kontrolli makset uuesti'}</button>
  </section>;
}
