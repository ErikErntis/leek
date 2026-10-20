'use client';

import { useRef, useState } from 'react';
import styles from '../site-header.module.css';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function logout() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      window.location.assign('/logi-sisse');
    } catch { setError('Väljalogimine ebaõnnestus. Proovi uuesti.'); setBusy(false); }
    finally { pending.current = false; }
  }
  return <span><button type="button" className={styles.logout} disabled={busy} onClick={logout}>{busy ? 'Palun oota…' : 'Logi välja'}</button>{error && <span role="alert" className={styles.logoutError}>{error}</span>}</span>;
}
