'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Eye, Plus, Upload } from 'lucide-react';
import { municipalities, serviceCategories, type CompanyService, type ServiceContent, type ServiceSave } from '@leek/contracts';
import type { PortalCompany } from '../../lib/portal';
import { ServiceDetail } from '../service-detail';

const statuses = { draft: 'Mustand', pending: 'Ülevaatamisel', approved: 'Kinnitatud', rejected: 'Tagasi lükatud' };
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const blank: ServiceContent = {
 title: '', category: serviceCategories[0], area: municipalities[0], description: '', pricing: 'quote', priceCents: null, photo: '',
};

export function ServiceEditor({ company, initial }: { company: PortalCompany; initial: CompanyService[] }) {
 const [items, setItems] = useState(initial);
 const [selected, setSelected] = useState<{ id: string; version: number | null } | null>(null);
 const [content, setContent] = useState(blank);
 const [price, setPrice] = useState('');
 const [preview, setPreview] = useState(false);
 const [error, setError] = useState('');
 const [message, setMessage] = useState('');
 const [busy, setBusy] = useState(false);
 const pending = useRef(false);
 const photoInput = useRef<HTMLInputElement>(null);
 const previewButton = useRef<HTMLButtonElement>(null);
 const titleInput = useRef<HTMLInputElement>(null);

 function change<K extends keyof ServiceContent>(key: K, value: ServiceContent[K]) {
  setContent(old => ({ ...old, [key]: value }));
  setMessage('');
 }

 function open(item?: CompanyService) {
  setSelected(item ? { id: item.id, version: item.version } : { id: crypto.randomUUID(), version: null });
  setContent(item?.content ?? blank);
  setPrice(item?.content.priceCents == null ? '' : (item.content.priceCents / 100).toFixed(2));
  setPreview(false);
  setError('');
  setMessage('');
  requestAnimationFrame(() => titleInput.current?.focus());
 }

 const current = items.find(item => item.id === selected?.id);
 const locked = current?.status === 'pending';
 const cents = /^\d+(?:[.,]\d{1,2})?$/.test(price.trim()) ? Math.round(Number(price.trim().replace(',', '.')) * 100) : null;
 const candidate = { ...content, priceCents: content.pricing === 'fixed' ? cents : null };

 async function save(action: ServiceSave['action']) {
  if (!selected || pending.current) return;
  const isContentEdit = action === 'draft' || action === 'submit';
  if (isContentEdit && content.pricing === 'fixed' && ((price.trim() && (cents === null || cents < 1 || cents > 100_000_000)) || (action === 'submit' && cents === null))) {
   setError('Sisesta hind eurodes, kuni kaks komakohta.');
   return;
  }
  if (action === 'submit' && (content.title.trim().length < 3 || content.description.trim().length < 10)) {
   setError('Sisesta vähemalt 3 märgi pikkune nimi ja 10 märgi pikkune kirjeldus.');
   return;
  }
  pending.current = true;
  setBusy(true);
  setError('');
  setMessage('');
  try {
   const response = await fetch(`/api/portal/company/${company.id}/services`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...selected, action, ...(isContentEdit ? { content: candidate } : {}) } satisfies ServiceSave),
    signal: AbortSignal.timeout(20000),
   });
   const result = await response.json();
   if (!response.ok) throw new Error(result.error ?? 'Teenuse salvestamine ebaõnnestus.');
   const saved: CompanyService = result;
   setItems(old => [saved, ...old.filter(item => item.id !== saved.id)]);
   setSelected({ id: saved.id, version: saved.version });
   if (isContentEdit) setContent(saved.content);
   setMessage({ draft: 'Mustand salvestatud.', submit: 'Teenus esitatud ülevaatusele.', hide: 'Teenus peidetud.', show: 'Teenus jälle avalik.' }[action]);
  } catch (reason) {
   setError(reason instanceof Error && reason.name === 'Error' ? reason.message : 'Teenuse salvestamine ebaõnnestus. Proovi uuesti.');
  } finally {
   pending.current = false;
   setBusy(false);
  }
 }

 async function upload(file?: File) {
  if (!file || pending.current || locked) return;
  if (!imageTypes.includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) {
   setError('Vali JPG-, PNG- või WebP-pilt suurusega kuni 5 MB.');
   return;
  }
  pending.current = true;
  setBusy(true);
  setError('');
  try {
   const response = await fetch(`/api/portal/company/${company.id}/image`, {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file, signal: AbortSignal.timeout(25000),
   });
   const result = await response.json();
   if (!response.ok) throw new Error(result.error ?? 'Foto üleslaadimine ebaõnnestus.');
   change('photo', result.url);
  } catch {
   setError('Fotot ei saanud üles laadida. Proovi uuesti.');
  } finally {
   pending.current = false;
   setBusy(false);
  }
 }

 function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!locked) void save('submit');
 }

 return <>
  <div className="workspace-heading">
   <div><h1>{selected ? selected.version === null ? 'Lisa teenus' : 'Muuda teenust' : 'Minu teenused'}</h1></div>
   {selected
    ? <button type="button" className="button secondary" disabled={busy} onClick={() => setSelected(null)}>Tagasi teenuste juurde</button>
    : <button type="button" className="button" onClick={() => open()}><Plus size={16} aria-hidden="true" /> Lisa teenus</button>}
  </div>
  {!selected ? <section className="panel">
   {items.length ? <ul className="service-owner-list">{items.map(item => <li key={item.id}>
    <button type="button" className="text-link" onClick={() => open(item)}>{item.content.title || 'Pealkirjata teenus'}</button>
    <span className="muted">{statuses[item.status]}{item.published && (item.visible ? ' · Avalik' : ' · Peidetud')}</span>
    {item.published && item.visible && <a className="text-link" href={`/teenused/${item.id}`}>Vaata avalikku teenust</a>}
   </li>)}</ul> : <p>Lisa esimene teenus, mida kliendid sinu ettevõttelt tellida saavad.</p>}
  </section> : <>
   <p className="service-editor-status">{statuses[current?.status ?? 'draft']}{current?.note && ` · Halduri märkus: ${current.note}`}</p>
   {message && <p className="profile-success" role="status">{message}</p>}
   {error && <p className="profile-feedback" role="alert">{error}</p>}
   {preview && <section className="panel service-preview">
    <div className="service-preview-heading"><strong>Avaliku teenuse eelvaade</strong><button type="button" className="button secondary" onClick={() => {
     setPreview(false);
     requestAnimationFrame(() => previewButton.current?.focus());
    }}>Tagasi vormi</button></div>
    <ServiceDetail service={candidate} company={{ name: company.name }} preview />
   </section>}
   <form onSubmit={submit} hidden={preview} aria-busy={busy}>
    <div className="service-editor-grid">
     <div className="service-editor-main">
      <fieldset className="profile-edit-card service-fields" disabled={busy || locked}>
       <legend>Teenuse andmed</legend>
       <label>Teenuse nimi<input ref={titleInput} value={content.title} maxLength={80} onChange={event => change('title', event.target.value)} /></label>
       <div className="service-fields-pair">
        <label>Kategooria<select value={content.category} onChange={event => change('category', event.target.value as ServiceContent['category'])}>{serviceCategories.map(item => <option key={item}>{item}</option>)}</select></label>
        <label>Teeninduspiirkond<select value={content.area} onChange={event => change('area', event.target.value as ServiceContent['area'])}>{municipalities.map(item => <option key={item}>{item}</option>)}</select></label>
       </div>
       <label>Teenuse kirjeldus<textarea value={content.description} maxLength={1000} rows={5} onChange={event => change('description', event.target.value)} /></label>
      </fieldset>
      <fieldset className="profile-edit-card service-fields" disabled={busy || locked || company.status === 'pending'}>
       <legend>Teenuse foto <small>Valikuline</small></legend>
       <div className="service-photo-controls">
        {content.photo && <img src={content.photo} alt="Teenuse foto eelvaade" width={100} height={64} />}
        <button type="button" className="button secondary" onClick={() => photoInput.current?.click()}><Upload size={16} aria-hidden="true" />{content.photo ? 'Vaheta pilti' : 'Vali pilt'}</button>
        {content.photo && <button type="button" className="text-link" onClick={() => change('photo', '')}>Eemalda foto</button>}
        <input ref={photoInput} type="file" accept={imageTypes.join(',')} hidden onChange={event => {
         void upload(event.currentTarget.files?.[0]);
         event.currentTarget.value = '';
        }} />
       </div>
       <small>JPG, PNG või WebP · kuni 5 MB</small>
      </fieldset>
     </div>
     <fieldset className="profile-edit-card service-fields service-pricing" disabled={busy || locked}>
      <legend>Hind ja tellimine</legend>
      <label className="service-price-option"><input type="radio" name="pricing" checked={content.pricing === 'quote'} onChange={() => change('pricing', 'quote')} /><span><strong>Pakkumise alusel</strong><small>Klient kirjeldab tööd ja sina saadad hinna.</small></span></label>
      <label className="service-price-option"><input type="radio" name="pricing" checked={content.pricing === 'fixed'} onChange={() => change('pricing', 'fixed')} /><span><strong>Kindel hind</strong><small>Klient saadab tellimissoovi kokkulepitud hinnaga.</small></span></label>
      {content.pricing === 'fixed' && <label>Hind (€)<input value={price} inputMode="decimal" maxLength={10} placeholder="60,00" onChange={event => { setPrice(event.target.value); setMessage(''); }} /></label>}
     </fieldset>
    </div>
    <div className="service-editor-actions">
     <button ref={previewButton} type="button" className="button secondary" disabled={busy} onClick={() => setPreview(true)}><Eye size={16} aria-hidden="true" /> Vaata eelvaadet</button>
     {current?.published && <button type="button" className="button secondary" disabled={busy} onClick={() => void save(current.visible ? 'hide' : 'show')}>{current.visible ? 'Peida teenus' : 'Näita teenust'}</button>}
     {!locked && <button type="button" className="button secondary" disabled={busy} onClick={() => void save('draft')}>Salvesta mustand</button>}
     {!locked && <button type="submit" className="button" disabled={busy || company.status !== 'published'}>Esita ülevaatusele <ArrowRight size={16} aria-hidden="true" /></button>}
    </div>
    {company.status !== 'published' && <p className="muted">Teenuse saad ülevaatusele esitada pärast ettevõtte kinnitamist.</p>}
   </form>
  </>}
 </>;
}
