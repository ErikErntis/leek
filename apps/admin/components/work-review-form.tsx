'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function WorkReviewForm({ id, version }: { id: string; version: number }) {
 const router = useRouter();
 const pending = useRef(false);
 const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
 const [note, setNote] = useState('');
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 async function submit(event: FormEvent) {
  event.preventDefault();
  if (pending.current) return;
  if (decision === 'reject' && note.trim().length < 5) {
   setError('Lisa parandusse saatmise põhjus (vähemalt 5 märki).'); return;
  }
  pending.current = true; setBusy(true); setError('');
  try {
   const response = await fetch(`/api/work/${id}/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, note: note.trim(), version }), signal: AbortSignal.timeout(20000),
   });
   if (response.status === 401) { router.push('/logi-sisse'); return; }
   const data = await response.json().catch(() => null);
   if (!response.ok) throw new Error(data?.error ?? 'Otsuse salvestamine ebaõnnestus. Värskenda järjekorda ja proovi uuesti.');
   router.refresh();
  } catch (error) {
   setError(error instanceof Error ? error.message : 'Ühendus ebaõnnestus.');
  } finally { pending.current = false; setBusy(false); }
 }
 return <form className="admin-form" onSubmit={submit}>
  <fieldset disabled={busy}>
   <legend>Ülevaatuse otsus</legend>
   <label className="admin-radio"><input type="radio" name={`decision-${id}`} checked={decision === 'approve'} onChange={() => setDecision('approve')} />Kinnita ja avalda</label>
   <label className="admin-radio"><input type="radio" name={`decision-${id}`} checked={decision === 'reject'} onChange={() => setDecision('reject')} />Saada parandusse</label>
   <label>Põhjus või märkus {decision === 'approve' && '(valikuline)'}<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} rows={3} required={decision === 'reject'} /></label>
   <p className="muted">Ettevõtja näeb märkust oma portaalis. Parandusse saadetud muudatuste asemel jääb varem kinnitatud versioon avalikuks kuni selle tähtajani.</p>
   {error && <p role="alert" className="admin-error">{error}</p>}
   <button className="button" type="submit">{busy ? 'Salvestan…' : decision === 'approve' ? 'Kinnita ja avalda' : 'Saada parandusse'}</button>
   {error && <button className="button secondary" type="button" onClick={() => router.refresh()}>Värskenda järjekorda</button>}
  </fieldset>
 </form>;
}
