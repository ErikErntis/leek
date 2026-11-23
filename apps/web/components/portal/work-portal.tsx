'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, CalendarDays, Clock, MapPin, MessageCircle, Plus } from 'lucide-react';
import {
 blankWork, municipalities, workActionSchema, workCategories, workContentSchema, workKinds, workLoads, workModes,
 workPayLabel, workStatuses, workSubmitSchema, workToday,
 type CompanyWork, type OwnWork, type WorkAction, type WorkContent,
} from '@leek/contracts';
import type { PortalCompany } from '../../lib/portal';
import './work-portal.css';

const formatDate = (value: string) => value ? new Intl.DateTimeFormat('et-EE', { timeZone: 'Europe/Tallinn' }).format(new Date(value + 'T12:00:00Z')) : 'Määramata';
const moneyInput = (value: number | null) => value === null ? '' : String(value / 100);
function parseMoney(value: string) {
 if (!value.trim()) return null;
 if (!/^\d+(?:[.,]\d{1,2})?$/.test(value)) throw new Error('Sisesta tasu eurodes, kuni kaks komakohta.');
 const cents = Math.round(Number(value.replace(',', '.')) * 100);
 if (!Number.isSafeInteger(cents) || cents > 100_000_000) throw new Error('Sisestatud tasu on liiga suur.');
 return cents;
}
type Fields = Partial<Record<keyof WorkContent, string>>;
type TextField = 'title' | 'address' | 'description' | 'requirements' | 'benefits' | 'deadline' | 'startsOn' | 'endsOn' | 'duration' | 'contactEmail' | 'contactUrl';

function WorkPreview({ content, company }: { content: WorkContent; company: string }) {
 return <article className="work-preview panel">
  <p className="eyebrow">{workKinds[content.kind]}</p>
  <h2>{content.title || 'Kuulutuse pealkiri'}</h2>
  <p className="muted">{company}</p>
  <div className="work-meta">
   <span><MapPin size={15} aria-hidden="true" /> {content.mode === 'remote' ? 'Kaugtöö' : content.municipality || 'Asukoht lisamata'}</span>
   <span>{workModes[content.mode]}</span>
   {content.kind === 'job' && <span>{workLoads[content.load]}</span>}
  </div>
  <p><strong>{workPayLabel(content)}</strong></p>
  <p className="muted">Vastamise tähtaeg {formatDate(content.deadline)}</p>
  {content.kind === 'gig' && <p><CalendarDays size={15} aria-hidden="true" /> {formatDate(content.startsOn)}{content.endsOn && ' – ' + formatDate(content.endsOn)}
   {content.duration && ' · ' + content.duration} · {content.people} {content.people === 1 ? 'tegija' : 'tegijat'}</p>}
  {content.address && <p className="muted">{content.address}</p>}
  <section><h3>{content.kind === 'gig' ? 'Ülesanne' : 'Töö kirjeldus'}</h3><p>{content.description || 'Töö kirjeldus lisatakse siia.'}</p></section>
  {content.requirements && <section><h3>Ootused tegijale</h3><p>{content.requirements}</p></section>}
  {content.benefits && <section><h3>Mida pakume</h3><p>{content.benefits}</p></section>}
  <section>
   <h3>Ühenduse võtmine</h3>
   {content.contactMethod === 'url' ? <p>Kandideeri välisel lehel <ArrowUpRight size={15} aria-hidden="true" /><br />{content.contactUrl || 'Link lisamata'}</p> :
    content.contactMethod === 'email' ? <p>{content.contactEmail || 'E-post lisamata'}<br /><span className="muted">E-kirja teema „Kandideerimine: {content.title}“</span></p> :
     <p><MessageCircle size={15} aria-hidden="true" /> Võta ühendust LEEKi portaalis</p>}
  </section>
 </article>;
}

export function WorkPortal({ company, initial }: { company: PortalCompany; initial: OwnWork }) {
 const [items, setItems] = useState(initial.items);
 const [canManage, setCanManage] = useState(initial.canManage);
 const [screen, setScreen] = useState<'list' | 'choose' | 'edit' | 'preview'>('list');
 const [selected, setSelected] = useState<CompanyWork | null>(null);
 const [content, setContent] = useState<WorkContent>(() => blankWork('job'));
 const [payMin, setPayMin] = useState('');
 const [payMax, setPayMax] = useState('');
 const [errors, setErrors] = useState<Fields>({});
 const [message, setMessage] = useState('');
 const [error, setError] = useState('');
 const [busy, setBusy] = useState(false);
 const [kind, setKind] = useState('all');
 const [status, setStatus] = useState('all');
 const [query, setQuery] = useState('');
 const [confirmClose, setConfirmClose] = useState<string | null>(null);
 const waiting = useRef(false);
 const newId = useRef<string | null>(null);
 const [dirty, setDirty] = useState(false);

 useEffect(() => {
  if (!dirty) return;
  const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
  window.addEventListener('beforeunload', warn);
  return () => window.removeEventListener('beforeunload', warn);
 }, [dirty]);

 const current = selected && items.find(item => item.id === selected.id);
 const visible = items.filter(item => (kind === 'all' || item.content.kind === kind) &&
  (status === 'all' || item.status === status) &&
  [item.content.title, item.content.description].join(' ').toLocaleLowerCase('et').includes(query.toLocaleLowerCase('et')));
 const planHref = `/portaal/pakett?company=${encodeURIComponent(company.id)}`;

 function change<K extends keyof WorkContent>(key: K, value: WorkContent[K]) {
  setContent(previous => ({ ...previous, [key]: value }));
  setErrors(previous => ({ ...previous, [key]: undefined }));
  setDirty(true); setMessage('');
 }
 async function run(task: () => Promise<void>) {
  if (waiting.current) return;
  waiting.current = true; setBusy(true); setError(''); setMessage('');
  try { await task(); }
  catch (reason) { setError(reason instanceof Error ? reason.message : 'Toiming ebaõnnestus. Proovi uuesti.'); }
  finally { waiting.current = false; setBusy(false); }
 }
 async function send(action: WorkAction) {
  const response = await fetch(`/api/portal/company/${company.id}/work`, {
   method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action), signal: AbortSignal.timeout(18000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
   if (response.status === 403) setCanManage(false);
   throw new Error(result?.error ?? 'Kuulutuse salvestamine ebaõnnestus.');
  }
  const item = result as CompanyWork;
  setItems(previous => [item, ...previous.filter(other => other.id !== item.id)]);
  return item;
 }
 function open(item: CompanyWork) {
  setConfirmClose(null); setSelected(item); setContent(item.content); setPayMin(moneyInput(item.content.payMinCents)); setPayMax(moneyInput(item.content.payMaxCents));
  setDirty(false); setErrors({}); setError(''); setMessage(''); setScreen('preview');
 }
 function back() {
  if (dirty && !window.confirm('Kas lahkuda? Salvestamata muudatused kaovad.')) return;
  setDirty(false); setScreen('list'); setError(''); setErrors({});
 }
 function create(type: WorkContent['kind']) {
  newId.current = crypto.randomUUID();
  setSelected(null); setContent(blankWork(type)); setPayMin(''); setPayMax('');
  setErrors({}); setError(''); setMessage(''); setDirty(false); setScreen('edit');
 }
 function assembled() {
  return { ...content, payMinCents: parseMoney(payMin), payMaxCents: parseMoney(payMax) };
 }
 async function save(action: 'draft' | 'submit') {
  await run(async () => {
   const input = assembled();
   const parsed = (action === 'submit' ? workSubmitSchema : workContentSchema).safeParse(input);
   if (!parsed.success) {
    const fields: Fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0] as keyof WorkContent] = issue.message;
    setErrors(fields);
    setScreen('edit');
    setError('Kontrolli märgitud välju.');
    return;
   }
   const request = workActionSchema.parse({ id: selected?.id ?? (newId.current ??= crypto.randomUUID()), version: selected?.version ?? null, action, content: parsed.data });
   const result = await send(request);
   setSelected(result); setContent(result.content); setDirty(false); setScreen('list'); setStatus('all');
   setMessage(action === 'submit' ? 'Kuulutus saadeti ülevaatusele.' : 'Mustand salvestatud.');
  });
 }
 async function reload() {
  if (dirty && !window.confirm('Laadida värske nimekiri? Salvestamata muudatused kaovad.')) return;
  await run(async () => {
   const response = await fetch(`/api/portal/company/${company.id}/work`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
   if (!response.ok) throw new Error('Kuulutusi ei saanud laadida.');
   const result: OwnWork = await response.json();
   setItems(result.items); setCanManage(result.canManage); setDirty(false); setScreen('list'); setSelected(null);
  });
 }
 const text = (name: TextField, label: string, multiline = false, extra = {}) => {
  const id = 'work-' + name;
  return <label className={multiline ? 'work-field full' : 'work-field'} key={name} htmlFor={id}>{label}
   {multiline ? <textarea id={id} value={String(content[name])} rows={4} maxLength={name === 'description' ? 4000 : 2000}
    onChange={event => change(name, event.target.value)} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? id + '-error' : undefined} /> :
    <input id={id} value={String(content[name])} onChange={event => change(name, event.target.value)} {...extra}
     aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? id + '-error' : undefined} />}
   {errors[name] && <span id={id + '-error'} className="work-error">{errors[name]}</span>}
  </label>;
 };
 const select = <K extends keyof WorkContent>(name: K, label: string, options: Record<string, string>) =>
  <label className="work-field" key={name}>{label}
   <select value={String(content[name])} onChange={event => change(name, event.target.value as WorkContent[K])} aria-invalid={Boolean(errors[name])}>
    {Object.entries(options).map(([value, title]) => <option value={value} key={value}>{title}</option>)}
   </select>{errors[name] && <span className="work-error">{errors[name]}</span>}
  </label>;

 return <div className="work-portal">
  <div className="workspace-heading work-heading">
   <div><h1>Tööpakkumised ja tööampsud</h1><p>Leia oma ettevõttesse töötaja või konkreetse ülesande tegija.</p></div>
   {screen === 'list' && canManage && <button className="button" type="button" disabled={busy} onClick={() => { setScreen('choose'); setMessage(''); setError(''); }}><Plus size={16} aria-hidden="true" /> Lisa kuulutus</button>}
  </div>
  {!canManage && <section className="panel work-access">
   <h2>Töökuulutused kuuluvad kolmandasse paketti Eestvedaja</h2>
   <p>Kuulutuse lisamiseks on vaja kinnitatud ettevõtet ja aktiivset kolmandat paketti.</p>
   <a className="button" href={planHref}>Vaata pakette</a>
  </section>}
  {message && <p className="work-success" role="status">{message}</p>}
  {error && <div className="work-error" role="alert"><p>{error}</p><button className="text-link" type="button" disabled={busy} onClick={reload}>Laadi nimekiri uuesti</button></div>}

  {screen === 'list' && <>
   <div className="work-list-filters">
    <label>Otsi kuulutust<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Pealkiri või märksõna" /></label>
    <label>Liik<select value={kind} onChange={event => setKind(event.target.value)}><option value="all">Kõik kuulutused</option>{Object.entries(workKinds).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <label>Olek<select value={status} onChange={event => setStatus(event.target.value)}><option value="all">Kõik olekud</option>{Object.entries(workStatuses).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
   </div>
   <p className="muted" aria-live="polite">{visible.length} kuulutust</p>
   <ul className="work-list">{visible.map(item => <li className="panel work-row" key={item.id}>
    <div><p className="eyebrow">{workKinds[item.content.kind]}</p>
     <h2><button className="work-title-link" type="button" onClick={() => open(item)}>{item.content.title || 'Pealkirjata mustand'}</button></h2>
     <p className="muted">{item.content.mode === 'remote' ? 'Kaugtöö' : item.content.municipality || 'Asukoht lisamata'} · {workPayLabel(item.content)}</p>
     {item.content.kind === 'gig' && <p className="muted">Töö aeg {formatDate(item.content.startsOn)}{item.content.endsOn && ' – ' + formatDate(item.content.endsOn)}</p>}
    </div>
    <div className="work-row-status"><span className="badge" data-status={item.status}>{workStatuses[item.status]}</span>
     <p className="muted">Tähtaeg {formatDate(item.content.deadline)}</p>
     <button className="text-link" type="button" onClick={() => open(item)}>Ava kuulutus →</button>
    </div>
   </li>)}</ul>
   {!visible.length && <section className="panel work-empty"><BriefcaseBusiness size={30} aria-hidden="true" />
    <h2>{items.length ? 'Valitud filtritega kuulutusi ei leitud' : 'Sinu ettevõttel pole veel töökuulutusi'}</h2>
    <p>{items.length ? 'Muuda otsingut või filtreid.' : 'Lisa tööpakkumine või tööamps, et leida sobiv tegija.'}</p>
    {items.length ? <button className="button secondary" type="button" onClick={() => { setKind('all'); setStatus('all'); setQuery(''); }}>Tühjenda filtrid</button> :
     canManage && <button className="button" type="button" onClick={() => setScreen('choose')}>Lisa esimene kuulutus</button>}
   </section>}
  </>}

  {screen === 'choose' && <><button className="text-link work-back" type="button" onClick={back}><ArrowLeft size={16} aria-hidden="true" /> Tagasi kuulutuste juurde</button>
   <h2>Millist tegijat otsid?</h2>
   <div className="work-choice-grid">
    <button type="button" className="panel work-choice" disabled={!canManage} onClick={() => create('job')}><BriefcaseBusiness size={28} aria-hidden="true" /><strong>Tööpakkumine</strong><span>Otsid oma ettevõttesse töötajat.</span><span className="text-link">Lisa tööpakkumine →</span></button>
    <button type="button" className="panel work-choice" disabled={!canManage} onClick={() => create('gig')}><Clock size={28} aria-hidden="true" /><strong>Tööamps</strong><span>Otsid konkreetse ülesande tegijat kindlaks ajaks.</span><span className="text-link">Lisa tööamps →</span></button>
   </div>
  </>}

  {(screen === 'edit' || screen === 'preview') && <>
   <button className="text-link work-back" type="button" disabled={busy} onClick={back}><ArrowLeft size={16} aria-hidden="true" /> Tagasi kuulutuste juurde</button>
   {selected?.note && <p className="work-note"><strong>Admini märkus</strong><br />{selected.note}</p>}
   {current?.published && ['draft','pending','returned'].includes(current.status) && <p className="work-note">Varasem kinnitatud versioon on avalik kuni uue versiooni kinnitamiseni või kuulutuse sulgemiseni.</p>}
   {screen === 'edit' ? <form className="panel work-editor" noValidate onSubmit={(event: FormEvent) => { event.preventDefault(); void save('submit'); }}>
    <fieldset disabled={busy || !canManage}>
     <h2>{selected ? 'Muuda kuulutust' : 'Uus ' + workKinds[content.kind].toLocaleLowerCase('et')}</h2>
     <div className="work-fields">
      {text('title', content.kind === 'job' ? 'Ametinimetus *' : 'Tööampsu pealkiri *', false, { maxLength: 120 })}
      {select('category', 'Valdkond', Object.fromEntries(workCategories.map(value => [value,value])))}
      {select('mode', 'Töö tegemise viis', workModes)}
      {select('municipality', 'Asukoht' + (content.mode === 'remote' ? '' : ' *'), { '': 'Vali omavalitsus', ...Object.fromEntries(municipalities.map(value => [value,value])) })}
      {text('address', 'Täpsem asukoht', false, { maxLength: 250, placeholder: 'Näiteks Paldiski, töökoja aadress' })}
      {content.kind === 'job' && select('load', 'Töökoormus', workLoads)}
      <label className="work-field">Brutotasu alates (€)<input type="text" inputMode="decimal" value={payMin} maxLength={12} onChange={event => { setPayMin(event.target.value); setDirty(true); }} /></label>
      <label className="work-field">Brutotasu kuni (€)<input type="text" inputMode="decimal" value={payMax} maxLength={12} onChange={event => { setPayMax(event.target.value); setDirty(true); }} aria-invalid={Boolean(errors.payMaxCents)} />{errors.payMaxCents && <span className="work-error">{errors.payMaxCents}</span>}</label>
      {select('payUnit', 'Tasu alus', content.kind === 'job' ? { month: 'Kuus', hour: 'Tunnis' } : { hour: 'Tunnis', day: 'Päevas', task: 'Kogu töö eest' })}
      <p className="muted work-pay-help">Tasuväljad võib jätta tühjaks. Siis kuvatakse „Tasu kokkuleppel“.</p>
      {text('deadline', 'Vastamise tähtaeg *', false, { type: 'date', min: workToday() })}
      {content.kind === 'gig' && <>
       {text('startsOn', 'Tööampsu algus *', false, { type: 'date', min: workToday() })}
       {text('endsOn', 'Tööampsu lõpp', false, { type: 'date', min: content.startsOn || workToday() })}
       {text('duration', 'Eeldatav kestus', false, { maxLength: 160, placeholder: 'Näiteks 4 tundi või 2 tööpäeva' })}
       <label className="work-field">Mitu tegijat vajad?<input type="number" min={1} max={1000} value={content.people} onChange={event => change('people', event.target.value === '' ? 1 : Number(event.target.value))} />{errors.people && <span className="work-error">{errors.people}</span>}</label>
      </>}
      {text('description', content.kind === 'gig' ? 'Ülesande kirjeldus *' : 'Töö kirjeldus *', true)}
      {text('requirements', content.kind === 'gig' ? 'Vajalikud oskused ja töövahendid' : 'Ootused kandidaadile', true)}
      {text('benefits', 'Mida pakume', true)}
      {select('contactMethod', 'Kuidas huviline ühendust võtab?', { url: 'Väline kandideerimislink', email: 'E-post', portal: 'LEEKi portaal' })}
      {content.contactMethod === 'email' && text('contactEmail', 'E-posti aadress *', false, { type: 'email', maxLength: 254 })}
      {content.contactMethod === 'url' && text('contactUrl', 'Kandideerimislink *', false, { type: 'url', maxLength: 2048, placeholder: 'https://www.cvkeskus.ee/...' })}
      {content.contactMethod === 'portal' && <p className="work-note">Huvilise sõnum jõuab ettevõtte päringute vaatesse. Vestluse alustamiseks logib huviline LEEKi sisse.</p>}
     </div>
    </fieldset>
    <div className="work-savebar"><span className="muted">{dirty ? 'Salvestamata muudatused' : 'Täida kuulutuse andmed'}</span>
     <div>
      <button className="button secondary" type="button" disabled={busy || !canManage} onClick={() => { try { setContent(assembled()); setScreen('preview'); setError(''); } catch (reason) { setError((reason as Error).message); } }}>Eelvaade</button>
      <button className="button secondary" type="button" disabled={busy || !canManage} onClick={() => save('draft')}>Salvesta mustand</button>
      <button className="button" type="submit" disabled={busy || !canManage}>{busy ? 'Salvestamine…' : 'Saada ülevaatusele'}</button>
     </div>
    </div>
   </form> : <div className="work-preview-grid">
    <WorkPreview content={content} company={company.name} />
    <aside className="panel work-preview-actions">
     <h2>Kuulutuse haldus</h2>
     <p><span className="badge" data-status={current?.status ?? 'draft'}>{workStatuses[current?.status ?? 'draft']}</span></p>
     {(!current || !['pending'].includes(current.status)) && canManage && <button type="button" className="button" disabled={busy} onClick={() => setScreen('edit')}>{selected ? 'Muuda kuulutust' : 'Tagasi vormile'}</button>}
     {current?.status === 'pending' && <button type="button" className="button secondary" disabled={busy} onClick={() => run(async () => { const result = await send({ id: current.id, version: current.version, action: 'withdraw' }); setSelected(result); setScreen('edit'); setMessage('Kuulutus võeti ülevaatuselt tagasi.'); })}>Võta ülevaatuselt tagasi</button>}
     {current && current.status !== 'closed' && <button type="button" className="button secondary" disabled={busy} onClick={() => setConfirmClose(current.id)}>Sulge kuulutus</button>}
     {confirmClose === current?.id && current && <div className="work-note"><p>Kas sulged selle kuulutuse?</p>
      <button className="button secondary" type="button" disabled={busy} onClick={() => setConfirmClose(null)}>Loobu</button>
      <button className="button" type="button" disabled={busy} onClick={() => run(async () => { const result = await send({ id: current.id, version: current.version, action: 'close' }); setSelected(result); setConfirmClose(null); setDirty(false); setScreen('list'); setMessage('Kuulutus suleti.'); })}>Jah, sulge</button>
     </div>}
     {screen === 'preview' && !selected && <p className="muted">See on kuulutuse eelvaade. Ülevaatusele saad selle saata vormilt.</p>}
    </aside>
   </div>}
  </>}
 </div>;
}
