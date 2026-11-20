'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { siteContentFields, siteContentSchema, type SiteContent, type SiteContentDocument, type SiteContentKey } from '@leek/contracts';

const groups = [...new Set(Object.values(siteContentFields).map(field => field.group))];
const entries = Object.entries(siteContentFields) as [SiteContentKey, typeof siteContentFields[SiteContentKey]][];

export function SiteContentEditor({ initial, siteUrl }: { initial: SiteContentDocument; siteUrl: string }) {
 const [content, setContent] = useState(initial.content);
 const [version, setVersion] = useState(initial.version);
 const [saved, setSaved] = useState(initial.content);
 const [errors, setErrors] = useState<Partial<Record<SiteContentKey, string>>>({});
 const [message, setMessage] = useState('');
 const [failure, setFailure] = useState('');
 const [conflict, setConflict] = useState(false);
 const [busy, setBusy] = useState(false);
 const [uploading, setUploading] = useState<SiteContentKey | null>(null);
 const working = useRef(false);
 const dirty = JSON.stringify(content) !== JSON.stringify(saved);

 useEffect(() => {
  if (!dirty) return;
  const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
  window.addEventListener('beforeunload', warn);
  return () => window.removeEventListener('beforeunload', warn);
 }, [dirty]);

 function change(key: SiteContentKey, value: string | boolean) {
  setContent(current => ({ ...current, [key]: value }));
  setErrors(current => ({ ...current, [key]: undefined }));
  setMessage('');
 }

 async function upload(key: SiteContentKey, file: File | undefined) {
  if (!file || working.current) return;
  if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
   setFailure('Vali JPG-, PNG- või WebP-pilt, kuni 5 MB.'); return;
  }
  working.current = true;
  setUploading(key);
  setFailure('');
  try {
   const response = await fetch('/api/settings/site-images', { method: 'POST', body: file, headers: { 'Content-Type': file.type }, signal: AbortSignal.timeout(30000) });
   const result = await response.json();
   if (!response.ok) throw new Error(result.error ?? 'Pildi üleslaadimine ebaõnnestus.');
   change(key, result.url);
   setMessage('Pilt üles laaditud. Avaldamiseks salvesta muudatused.');
  } catch (error) { setFailure(error instanceof Error ? error.message : 'Pildi üleslaadimine ebaõnnestus.'); }
  finally { working.current = false; setUploading(null); }
 }

 async function reload() {
  if (working.current || !window.confirm('Laadida värske versioon? Salvestamata muudatused kaovad.')) return;
  working.current = true;
  setBusy(true);
  try {
   const response = await fetch('/api/settings/site-content', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
   const result = await response.json();
   if (!response.ok) throw new Error(result.error ?? 'Sisu laadimine ebaõnnestus.');
   const next = siteContentSchema.parse(result.content);
   setContent(next); setSaved(next); setVersion(result.version);
   setConflict(false); setErrors({}); setFailure(''); setMessage('Värske versioon laaditud.');
  } catch (error) { setFailure(error instanceof Error ? error.message : 'Sisu laadimine ebaõnnestus.'); }
  finally { working.current = false; setBusy(false); }
 }

 async function save(event: FormEvent) {
  event.preventDefault();
  if (working.current) return;
  const parsed = siteContentSchema.safeParse(content);
  if (!parsed.success) {
   const fields: Partial<Record<SiteContentKey, string>> = {};
   for (const issue of parsed.error.issues) fields[issue.path[0] as SiteContentKey] = issue.message;
   setErrors(fields);
   setFailure('Kontrolli märgitud välju.');
   const key = Object.keys(fields)[0];
   const field = document.getElementById('site-' + key);
   field?.closest('details')?.setAttribute('open', '');
   field?.focus();
   return;
  }
  working.current = true;
  setBusy(true); setFailure(''); setMessage('');
  try {
   const response = await fetch('/api/settings/site-content', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version, content: parsed.data }),
    signal: AbortSignal.timeout(25000),
   });
   const result = await response.json();
   if (response.status === 409) setConflict(true);
   if (!response.ok) throw new Error(result.error ?? 'Sisu salvestamine ebaõnnestus.');
   const next = siteContentSchema.parse(result.content);
   setContent(next); setSaved(next); setVersion(result.version); setConflict(false); setErrors({});
   setMessage('Muudatused salvestatud ja avaldatud.');
  } catch (error) { setFailure(error instanceof Error ? error.message : 'Sisu salvestamine ebaõnnestus.'); }
  finally { working.current = false; setBusy(false); }
 }

 return <form className="site-editor" onSubmit={save} noValidate>
  <fieldset disabled={busy || uploading !== null}>
   {groups.map((group, index) => <details className="panel site-editor-section" key={group} open={index === 0 || undefined}>
    <summary>{group}</summary>
    <div className="site-editor-fields">
     {entries.filter(([, field]) => field.group === group).map(([key, field]) => {
      const id = 'site-' + key;
      const errorId = id + '-error';
      const value = content[key];
      const input = { id, 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? errorId : undefined };
      if (field.kind === 'toggle') return <label className="site-editor-toggle" key={key}>
       <input {...input} type="checkbox" checked={value === true} onChange={event => change(key, event.target.checked)} />{field.label}
      </label>;
      return <div className={'site-editor-field' + (field.kind === 'textarea' || field.kind === 'image' ? ' full' : '')} key={key}>
       <label htmlFor={id}>{field.label}</label>
       {field.kind === 'textarea'
        ? <textarea {...input} value={String(value)} maxLength={4000} rows={3} onChange={event => change(key, event.target.value)} />
        : <input {...input} type="text" value={String(value)} maxLength={field.kind === 'image' || field.kind === 'link' ? 2048 : 400} onChange={event => change(key, event.target.value)} />}
       {field.kind === 'image' && <>
        {String(value) && <img className="site-editor-image" src={String(value).startsWith('/images/') ? new URL(String(value), siteUrl).href : String(value)} alt={field.label + ', eelvaade'} width={300} height={170} />}
        <label className="site-editor-upload">Laadi uus pilt
         <input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
          void upload(key, event.target.files?.[0]); event.target.value = '';
         }} />
        </label><small>JPG, PNG või WebP, kuni 5 MB. Pildi saad lisada ka HTTPS-aadressina.</small>
       </>}
       {errors[key] && <p id={errorId} className="site-editor-error">{errors[key]}</p>}
      </div>;
     })}
    </div>
   </details>)}
  </fieldset>
  {failure && <p className="site-editor-error" role="alert">{failure}</p>}
  {conflict && <button className="button secondary" type="button" onClick={reload} disabled={busy}>Laadi värske versioon</button>}
  {message && <p role="status">{message}</p>}
  <div className="site-editor-save">
   <span>{uploading ? 'Pildi üleslaadimine…' : dirty ? 'Salvestamata muudatused' : 'Kõik muudatused on salvestatud'}</span>
   <div><a href={siteUrl} target="_blank" rel="noopener noreferrer" className="text-link">Vaata avalikku lehte ↗</a>
    <button className="button" type="submit" disabled={busy || uploading !== null || !dirty || conflict}>{busy ? 'Salvestamine…' : 'Salvesta ja avalda'}</button>
   </div>
  </div>
 </form>;
}
