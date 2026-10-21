'use client';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function ReviewForm({ id }: { id: string }) {
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const router = useRouter();
  async function submit(event: FormEvent) {
    event.preventDefault(); if (pending.current) return;
    if (decision === 'reject' && note.trim().length < 5) { setError('Lisa tagasilükkamise põhjus (vähemalt 5 märki).'); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      const response = await fetch(`/api/review/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, note: note.trim() }), signal: AbortSignal.timeout(20000) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? 'Otsuse salvestamine ebaõnnestus. Värskenda lehte ja kontrolli staatust.');
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Ühendus ebaõnnestus.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <form className="admin-form" onSubmit={submit}>
    <fieldset disabled={busy}><legend>Ülevaatuse otsus</legend><label className="admin-radio"><input type="radio" name="decision" checked={decision === 'approve'} onChange={() => setDecision('approve')} />Kinnita ja avalda kataloogis</label><label className="admin-radio"><input type="radio" name="decision" checked={decision === 'reject'} onChange={() => setDecision('reject')} />Lükka tagasi</label><label>Põhjus või märkus {decision === 'approve' ? '(valikuline)' : ''}<textarea rows={4} value={note} onChange={event => setNote(event.target.value)} maxLength={1000} required={decision === 'reject'} /></label><p className="muted">Märkus on nähtav ka ettevõtte esitajale. Kinnitamine ei aktiveeri tasulist paketti.</p>{error && <p className="admin-error" role="alert">{error}</p>}<button type="submit" className="button">{busy ? 'Salvestan…' : decision === 'approve' ? 'Kinnita ja avalda' : 'Lükka taotlus tagasi'}</button></fieldset>
  </form>;
}
