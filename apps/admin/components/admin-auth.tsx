'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';

export function AdminLogin() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  useEffect(() => setReady(true), []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current) return;
    const form = new FormData(event.currentTarget);
    pending.current = true; setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/sign-in/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: String(form.get('email')).trim(), password: form.get('password') }), signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(response.status === 429 ? 'Liiga palju katseid. Proovi hiljem uuesti.' : response.status >= 500 ? 'Teenusega ei saanud ühendust. Proovi uuesti.' : 'E-post või parool ei ole õige.');
      window.location.assign('/');
    } catch (error) { setError(error instanceof Error ? error.message : 'Sisselogimine ebaõnnestus.'); setBusy(false); pending.current = false; }
  }
  return <form className="admin-form" method="post" onSubmit={submit}><label>E-posti aadress<input name="email" type="email" autoComplete="username" required maxLength={254} /></label><label>Parool<input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label>{error && <p role="alert" className="admin-error">{error}</p>}<button className="button" disabled={!ready || busy}>{busy ? 'Palun oota…' : 'Logi halduskeskusesse'}</button></form>;
}

export function AdminLogout() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    if (busy) return; setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/sign-out', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      window.location.assign('/logi-sisse');
    } catch { setError('Väljalogimine ebaõnnestus.'); setBusy(false); }
  }
  return <span><button className="admin-logout" type="button" onClick={logout} disabled={busy}>{busy ? 'Palun oota…' : 'Logi välja'}</button>{error && <span role="alert" className="admin-error">{error}</span>}</span>;
}
