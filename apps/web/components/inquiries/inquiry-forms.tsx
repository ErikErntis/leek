'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { formatServicePrice, inquiryActionSchema, inquiryCreateSchema, type InquiryAction, type InquiryCreate } from '@leek/contracts';
import { inboxHref } from '../../lib/inquiry-links';

type Option = { id: string; title: string; priceCents: number | null };

async function send<T>(path: string, body: object): Promise<T> {
 const response = await fetch(path, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(18000),
 });
 const payload = await response.json().catch(() => null);
 if (!response.ok) throw new Error(payload?.error ?? 'Päring ebaõnnestus. Proovi uuesti.');
 return payload;
}

function useInquirySubmit() {
 const waiting = useRef(false);
 const id = useRef<string | null>(null);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 async function run(task: (id: string) => Promise<void>) {
  if (waiting.current) return;
  waiting.current = true;
  setBusy(true);
  setError('');
  try {
   await task(id.current ??= crypto.randomUUID());
   id.current = null;
  } catch (reason) {
   setError(reason instanceof Error && !['TypeError', 'TimeoutError'].includes(reason.name) ? reason.message : 'Ühendus ebaõnnestus. Proovi uuesti.');
  } finally {
   waiting.current = false;
   setBusy(false);
  }
 }
 return { run, busy, error };
}

export function NewInquiryForm({ source, listingId, options, selectedId, priceCents, fixed }: {
 source: 'service' | 'product'; listingId: string; options: Option[]; selectedId?: string;
 priceCents: number | null; fixed: boolean;
}) {
 const router = useRouter();
 const { run, busy, error } = useInquirySubmit();
 const [sent, setSent] = useState(false);
 const [optionId, setOptionId] = useState(options.find(option => option.id === selectedId)?.id ?? options[0]?.id ?? '');
 const selectedPrice = options.length ? options.find(option => option.id === optionId)?.priceCents ?? null : priceCents;
 function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (sent) return;
  const data = new FormData(event.currentTarget);
  void run(async id => {
   const base = { id, listingId, optionId: optionId || null, message: String(data.get('message') ?? '') };
   const input: InquiryCreate = source === 'product'
    ? { ...base, source, quantity: Number(data.get('quantity')) }
    : { ...base, source, expectedPriceCents: fixed ? selectedPrice : null,
     location: String(data.get('location') ?? ''), desiredDate: String(data.get('desiredDate') ?? '') || null };
   const parsed = inquiryCreateSchema.safeParse(input);
   if (!parsed.success) throw new Error('Kontrolli päringu andmeid.');
   const result = await send<{ id: string }>('/api/paringud', parsed.data);
   setSent(true);
   router.push(inboxHref(undefined, result.id));
  });
 }
 return <form className="inbox-form" onSubmit={submit} aria-busy={busy}>
  <fieldset disabled={busy || sent}>
   {options.length > 0 && <label>{source === 'product' ? 'Variant' : 'Pakett'}
    <select value={optionId} onChange={event => setOptionId(event.target.value)}>{options.map(option => <option key={option.id} value={option.id}>
     {option.title}{option.priceCents !== null && ` · ${formatServicePrice(option.priceCents)}`}
    </option>)}</select>
   </label>}
   {selectedPrice !== null && <p className="inbox-price">{formatServicePrice(selectedPrice)} {source === 'product' && ' / tk'}</p>}
   {source === 'product' ? <label>Kogus<input name="quantity" type="number" min={1} max={999} defaultValue={1} required /></label> :
    <div className="inbox-form-pair">
     <label>Töö asukoht<input name="location" maxLength={250} minLength={2} placeholder="Näiteks Paldiski" required /></label>
     <label>Soovitud kuupäev <small>Valikuline</small><input name="desiredDate" type="date" /></label>
    </div>}
   <label>{source === 'product' ? 'Sõnum' : 'Töö kirjeldus'}<textarea name="message" rows={5} maxLength={4000} required /></label>
   <button className="button" type="submit" disabled={fixed && selectedPrice === null}>{sent ? 'Päring saadetud' : busy ? 'Saadan…' : fixed ? 'Saada tellimissoov' : 'Saada päring'}</button>
  </fieldset>
  {error && <p className="inbox-error" role="alert">{error}</p>}
 </form>;
}

export function InquiryActionForm({ id, company, kind, offerId = null }: {
 id: string; company?: string; kind: 'reply' | 'offer' | 'decide'; offerId?: string | null;
}) {
 const router = useRouter();
 const { run, busy, error } = useInquirySubmit();
 const [done, setDone] = useState(false);
 function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitter = (event.nativeEvent as SubmitEvent).submitter;
  const data = new FormData(form, submitter);
  void run(async nonce => {
   const message = String(data.get('message') ?? '');
   let action: InquiryAction;
   if (kind === 'reply') action = { action: 'reply', id: nonce, message };
   else if (kind === 'offer') {
    const price = String(data.get('price') ?? '').trim();
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(price)) throw new Error('Sisesta hind eurodes, kuni kaks komakohta.');
    action = { action: 'offer', id: nonce, priceCents: Math.round(Number(price.replace(',', '.')) * 100),
     proposedDate: String(data.get('proposedDate') ?? '') || null, message };
   } else {
    const decision = data.get('decision');
    if (decision !== 'accept' && decision !== 'decline') return;
    action = { action: 'decide', decision, offerId };
   }
   const parsed = inquiryActionSchema.safeParse(action);
   if (!parsed.success) throw new Error('Kontrolli sisestatud andmeid.');
   await send(`/api/paringud/${id}${company ? '?company=' + encodeURIComponent(company) : ''}`, parsed.data);
   if (kind === 'decide') setDone(true);
   form.reset();
   router.refresh();
  });
 }
 if (done) return <p role="status">Otsus salvestatud.</p>;
 return <form className="inbox-form" onSubmit={submit} aria-busy={busy}>
  <fieldset disabled={busy}>
   {kind === 'offer' && <div className="inbox-form-pair">
    <label>Pakkumise hind (€)<input name="price" inputMode="decimal" maxLength={10} required /></label>
    <label>Pakutav kuupäev <small>Valikuline</small><input name="proposedDate" type="date" /></label>
   </div>}
   {kind === 'decide' ? <div className="inbox-actions">
    <button className="button" type="submit" name="decision" value="accept">{offerId ? 'Kinnita pakkumine' : 'Kinnita tellimissoov'}</button>
    <button className="button secondary" type="submit" name="decision" value="decline">Lükka tagasi</button>
   </div> : <>
    <label>{kind === 'reply' ? 'Sinu vastus' : 'Pakkumise tingimused'}<textarea name="message" rows={3} maxLength={4000} required /></label>
    <button type="submit" className="button">{busy ? 'Saadan…' : kind === 'reply' ? 'Saada vastus' : 'Saada pakkumine'}</button>
   </>}
  </fieldset>
  {error && <p className="inbox-error" role="alert">{error}</p>}
 </form>;
}
