'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, CircleHelp, PackagePlus, Store, Upload } from 'lucide-react';
import {
 formatServicePrice, productAvailability, productCategories, type CompanyProduct, type ProductContent, type ProductSave,
 type ProductShop, type ShopConnectionInput, type ShopPlatform, type StoreProductPage,
} from '@leek/contracts';
import type { PortalCompany } from '../../lib/portal';

const statuses = { draft: 'Mustand', pending: 'Ülevaatamisel', approved: 'Kinnitatud', rejected: 'Tagasi lükatud' };
const shopNames = { shopify: 'Shopify', woocommerce: 'WooCommerce', wix: 'Wix Stores' };
const blank: ProductContent = { title: '', description: '', category: productCategories[0], photos: [], availability: 'in_stock', priceCents: null, shopUrl: '', variants: [] };
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
type Variant = Omit<ProductContent['variants'][number], 'priceCents'> & { price: string };
type Catalog = StoreProductPage & { shop: ProductShop; imported: string[]; cursor: string | null };

function displayPrice(cents: number | null) { return cents === null ? '' : (cents / 100).toFixed(2); }
function readPrice(value: string) {
 const trimmed = value.trim();
 if (!trimmed) return null;
 if (!/^\d+(?:[.,]\d{1,2})?$/.test(trimmed)) throw new Error('Sisesta hind eurodes, kuni kaks komakohta.');
 const cents = Math.round(Number(trimmed.replace(',', '.')) * 100);
 if (cents > 100_000_000) throw new Error('Sisestatud hind on liiga suur.');
 return cents;
}
function Availability({ value, onChange }: { value: ProductContent['availability']; onChange: (value: ProductContent['availability']) => void }) {
 return <label>Saadavus<select value={value} onChange={event => onChange(event.target.value as ProductContent['availability'])}>
  {Object.entries(productAvailability).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
 </select></label>;
}

export function ProductPortal({ company, initial }: { company: PortalCompany; initial: { items: CompanyProduct[]; shops: ProductShop[] } }) {
 const [mode, setMode] = useState<'list' | 'manual' | 'store' | 'help'>('list');
 const [items, setItems] = useState(initial.items);
 const [shops, setShops] = useState(initial.shops);
 const [selected, setSelected] = useState<{ id: string; version: number | null } | null>(null);
 const [content, setContent] = useState(blank);
 const [price, setPrice] = useState('');
 const [variants, setVariants] = useState<Variant[]>([]);
 const [connection, setConnection] = useState<ShopConnectionInput>({ platform: 'shopify', url: '' });
 const [wixSiteId, setWixSiteId] = useState('');
 const [wixApiKey, setWixApiKey] = useState('');
 const [catalog, setCatalog] = useState<Catalog | null>(null);
 const [checked, setChecked] = useState<string[]>([]);
 const [helpId, setHelpId] = useState('');
 const [helpSent, setHelpSent] = useState(false);
 const [error, setError] = useState('');
 const [message, setMessage] = useState('');
 const [busy, setBusy] = useState(false);
 const working = useRef(false);
 const photoInput = useRef<HTMLInputElement>(null);

 const current = items.find(item => item.id === selected?.id);
 const linked = Boolean(current?.shopId);
 const locked = current?.status === 'pending';
 const route = `/api/portal/company/${company.id}`;

 const savedConnection = shops.find(shop => shop.url === connection.url && shop.platform === connection.platform);
 const needsWixCredentials = connection.platform === 'wix' && (!savedConnection || Boolean(wixSiteId || wixApiKey));

 function clearWixCredentials() {
  setWixSiteId('');
  setWixApiKey('');
 }

 async function post<T>(body: unknown): Promise<T> {
  const response = await fetch(`${route}/products`, {
   method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(17000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error ?? 'Toiming ebaõnnestus. Proovi uuesti.');
  return result;
 }
 async function run(task: () => Promise<void>) {
  if (working.current) return;
  working.current = true;
  setBusy(true);
  setError('');
  setMessage('');
  try { await task(); }
  catch (reason) { setError(reason instanceof Error && reason.name === 'Error' ? reason.message : 'Ühendus ebaõnnestus. Proovi uuesti.'); }
  finally { working.current = false; setBusy(false); }
 }
 function switchMode(next: typeof mode) {
  setMode(next);
  clearWixCredentials();
  setError('');
  setMessage('');
 }
 function edit(item?: CompanyProduct) {
  switchMode('manual');
  setSelected(item ? { id: item.id, version: item.version } : { id: crypto.randomUUID(), version: null });
  setContent(item?.content ?? blank);
  setPrice(displayPrice(item?.content.priceCents ?? null));
  setVariants(item?.content.variants.map(({ priceCents, ...variant }) => ({ ...variant, price: displayPrice(priceCents) })) ?? []);
 }
 function change<K extends keyof ProductContent>(key: K, value: ProductContent[K]) {
  setContent(old => ({ ...old, [key]: value }));
  setMessage('');
 }
 function changeVariant(id: string, patch: Partial<Variant>) {
  setVariants(old => old.map(item => item.id === id ? { ...item, ...patch } : item));
 }
 function openStore() {
  switchMode('store');
  setCatalog(null);
  setChecked([]);
  setConnection(shops[0] ?? { platform: 'shopify', url: '' });
 }
 function loadStore(input: ShopConnectionInput, cursor: string | null) {
  return run(async () => {
   const { platform, url } = input;
   const wix = platform === 'wix' && (wixSiteId.trim() || wixApiKey.trim())
    ? { siteId: wixSiteId.trim(), apiKey: wixApiKey.trim() }
    : undefined;
   if (wix && (!wix.siteId || !wix.apiKey)) throw new Error('Sisesta nii Wixi saidi ID kui ka API võti.');
   const result = await post<Omit<Catalog, 'cursor'>>({ action: 'catalog', connection: { platform, url, ...(wix ? { wix } : {}) }, cursor });
   clearWixCredentials();
   setConnection({ platform: result.shop.platform, url: result.shop.url });
   setShops(old => old.some(shop => shop.id === result.shop.id) ? old : [...old, result.shop]);
   setCatalog({ ...result, cursor });
   setChecked([]);
  });
 }
 function save(action: ProductSave['action']) {
  if (!selected) return;
  void run(async () => {
   const changes = action === 'draft' || action === 'submit';
   const body: ProductSave = { ...selected, action };
   if (changes) {
    body.content = linked ? content : {
     ...content, priceCents: variants.length ? null : readPrice(price),
     variants: variants.map(({ price, ...variant }) => ({ ...variant, priceCents: readPrice(price) })),
    };
   }
   const item = await post<CompanyProduct>(body);
   setItems(old => [item, ...old.filter(entry => entry.id !== item.id)]);
   setSelected({ id: item.id, version: item.version });
   if (changes) setContent(item.content);
   setMessage({ draft: 'Mustand salvestatud.', submit: 'Toode esitatud ülevaatusele.', hide: 'Toode peidetud.', show: 'Toode jälle avalik.' }[action]);
  });
 }
 function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!locked) save('submit');
 }
 function upload(file?: File) {
  if (!file) return;
  void run(async () => {
   if (!imageTypes.includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) throw new Error('Vali JPG-, PNG- või WebP-pilt suurusega kuni 5 MB.');
   const response = await fetch(`${route}/image`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file, signal: AbortSignal.timeout(17000) });
   const result = await response.json().catch(() => null);
   if (!response.ok) throw new Error(result?.error ?? 'Pilti ei saanud üles laadida.');
   setContent(old => ({ ...old, photos: [...old.photos, result.url] }));
  });
 }
 function sendHelp(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  void run(async () => {
   await post({ action: 'help', id: helpId, shopUrl: String(data.get('shopUrl')), email: String(data.get('email')), message: String(data.get('message')) });
   setHelpSent(true);
   setMessage('Abipäring saadetud. Võtame sinuga e-posti teel ühendust.');
  });
 }

 const title = { list: 'Minu tooted', manual: selected?.version === null ? 'Lisa toode' : 'Muuda toodet', store: 'Ühenda oma e-pood', help: 'Vajan ühendamisel abi' }[mode];
 return <>
  <div className="workspace-heading"><h1>{title}</h1>
   {mode !== 'list' && <button type="button" className="button secondary" disabled={busy} onClick={() => switchMode('list')}>Tagasi toodete juurde</button>}
  </div>
  {message && <p className="profile-success" role="status">{message}</p>}
  {error && <p className="profile-feedback" role="alert">{error}</p>}
  {mode === 'list' && <>
   <div className="product-entry-grid">
    <Entry icon={<PackagePlus />} title="Lisa toode käsitsi" onClick={() => edit()}>Lisa toote andmed ja pildid. Soovi korral lisa e-poe link.</Entry>
    <Entry icon={<Store />} title="Ühenda oma e-pood" onClick={openStore}>Vali Shopify, WooCommerce või Wix Stores ja impordi sobivad tooted.</Entry>
    <Entry icon={<CircleHelp />} title="Vajan ühendamisel abi" onClick={() => {
     setHelpId(crypto.randomUUID());
     setHelpSent(false);
     switchMode('help');
    }}>Tasuline seadistusabi. Küsi pakkumist.</Entry>
   </div>
   <section className="panel product-section">
    <h2>Minu tooted</h2>
    {items.length ? <ul className="service-owner-list">{items.map(item => <li key={item.id}>
     <button type="button" className="text-link" onClick={() => edit(item)}>{item.content.title || 'Nimeta toode'}</button>
     <span className="muted">{statuses[item.status]}{item.published && (item.visible ? ' · Avalik' : ' · Peidetud')}{item.shopId && ' · E-poest'}</span>
     {item.published && item.visible && <a className="text-link" href={`/tooted/${item.id}`}>Vaata avalikku toodet</a>}
    </li>)}</ul> : <p>Lisa esimene toode.</p>}
   </section>
  </>}
  {mode === 'manual' && selected && <form onSubmit={submit} aria-busy={busy}>
   <p className="muted">{statuses[current?.status ?? 'draft']}{current?.note && ` · Halduri märkus: ${current.note}`}</p>
   <div className="service-editor-grid">
    <div className="service-editor-main">
     <fieldset className="profile-edit-card service-fields" disabled={busy || locked}>
      <legend>Toote andmed</legend>
      <label>Toote nimi<input value={content.title} maxLength={120} onChange={event => change('title', event.target.value)} /></label>
      <label>Kategooria<select value={content.category} onChange={event => change('category', event.target.value as ProductContent['category'])}>{productCategories.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Kirjeldus<textarea value={content.description} rows={5} maxLength={2000} onChange={event => change('description', event.target.value)} /></label>
     </fieldset>
     <fieldset className="profile-edit-card service-fields" disabled={busy || locked}>
      <legend>Toote pildid</legend>
      <div className="product-edit-photos">{content.photos.map((photo, index) => <div key={`${photo}-${index}`}>
       <img src={photo} alt={`Toote pilt ${index + 1}`} width={115} height={90} referrerPolicy="no-referrer" />
       <button type="button" className="text-link" onClick={() => change('photos', content.photos.filter((_, position) => position !== index))} aria-label={`Eemalda pilt ${index + 1}`}>Eemalda</button>
      </div>)}</div>
      <button type="button" className="button secondary" disabled={content.photos.length >= 5 || company.status === 'pending'} onClick={() => photoInput.current?.click()}><Upload size={16} aria-hidden="true" /> Lisa pilt</button>
      <input ref={photoInput} type="file" accept={imageTypes.join(',')} hidden onChange={event => {
       upload(event.currentTarget.files?.[0]);
       event.currentTarget.value = '';
      }} />
      <small>JPG, PNG või WebP · kuni 5 pilti, igaüks kuni 5 MB</small>
     </fieldset>
    </div>
    <fieldset className="profile-edit-card service-fields" disabled={busy || locked}>
     <legend>Hind ja saadavus</legend>
     {linked ? <p className="muted">Hind, saadavus ja ostulink uuenevad e-poe andmetest. Variandid valib klient e-poes.</p> : <>
      {!variants.length && <>
       <label>Hind (€)<input value={price} inputMode="decimal" maxLength={10} onChange={event => setPrice(event.target.value)} /></label>
       <Availability value={content.availability} onChange={value => change('availability', value)} />
      </>}
      {variants.map((item, index) => <div key={item.id} className="service-package-editor" role="group" aria-label={`Variant ${index + 1}`}>
       <div className="service-package-heading"><strong>Variant {index + 1}</strong><button type="button" className="text-link" onClick={() => setVariants(old => old.filter(entry => entry.id !== item.id))}>Eemalda</button></div>
       <label>Variandi nimi<input value={item.name} maxLength={60} onChange={event => changeVariant(item.id, { name: event.target.value })} /></label>
       <label>Hind (€)<input value={item.price} inputMode="decimal" maxLength={10} onChange={event => changeVariant(item.id, { price: event.target.value })} /></label>
       <Availability value={item.availability} onChange={value => changeVariant(item.id, { availability: value })} />
      </div>)}
      <button className="button secondary" type="button" disabled={variants.length >= 10} onClick={() => {
       const entry = { id: crypto.randomUUID(), name: '', price: variants.length ? '' : price, availability: content.availability };
       setVariants(old => [...old, entry]);
      }}>Lisa variant</button>
      <label>Toote link e-poes <small>Valikuline</small><input type="url" value={content.shopUrl} maxLength={2048} placeholder="https://epood.ee/toode" onChange={event => change('shopUrl', event.target.value)} /></label>
     </>}
    </fieldset>
   </div>
   <div className="service-editor-actions">
    {current?.published && <button type="button" className="button secondary" disabled={busy} onClick={() => save(current.visible ? 'hide' : 'show')}>{current.visible ? 'Peida toode' : 'Näita toodet'}</button>}
    {!locked && <button type="button" className="button secondary" disabled={busy} onClick={() => save('draft')}>Salvesta mustand</button>}
    {!locked && <button type="submit" className="button" disabled={busy || company.status !== 'published'}>Esita ülevaatusele</button>}
   </div>
   {company.status !== 'published' && <p className="muted">Toote saad ülevaatusele esitada pärast ettevõtte kinnitamist.</p>}
  </form>}
  {mode === 'store' && <>
   <form className="panel service-fields" aria-busy={busy} onSubmit={event => { event.preventDefault(); void loadStore(connection, null); }}>
    {shops.length > 0 && <label>Ühendatud poed<select value={savedConnection?.id ?? ''} onChange={event => {
     const shop = shops.find(item => item.id === event.target.value);
     setConnection(shop ? { url: shop.url, platform: shop.platform } : { url: '', platform: 'shopify' });
     setCatalog(null);
     clearWixCredentials();
     setChecked([]);
    }} disabled={busy}><option value="">Lisa uus pood</option>{shops.map(shop => <option value={shop.id} key={shop.id}>{shopNames[shop.platform]} · {shop.url}</option>)}</select></label>}
    <label>Platvorm<select value={connection.platform} disabled={busy} onChange={event => {
     setConnection(old => ({ ...old, platform: event.target.value as ShopPlatform }));
     clearWixCredentials();
     setCatalog(null);
    }}><option value="shopify">Shopify</option><option value="woocommerce">WooCommerce</option><option value="wix">Wix Stores</option></select></label>
    <label>Poe aadress<input required value={connection.url} maxLength={500} disabled={busy} placeholder={connection.platform === 'shopify' ? 'sinupood.myshopify.com' : connection.platform === 'wix' ? 'https://sinupood.wixsite.com/pood' : 'https://sinupood.ee'} onChange={event => {
     setConnection(old => ({ ...old, url: event.target.value }));
     clearWixCredentials();
     setCatalog(null);
    }} /></label>
    <small>{connection.platform === 'shopify' ? 'Sisesta poe myshopify.com aadress. Tooted peavad olema avalikus veebipoes.'
     : connection.platform === 'woocommerce' ? 'Sisesta WooCommerce’i poe avalehe aadress.'
     : 'Sisesta avaliku Wix Storesi poe aadress. API võti peab saama lugeda toodete andmeid ja kataloogi versiooni.'}</small>
    {connection.platform === 'wix' && <>
     {savedConnection && <small>Uue võtme salvestamiseks sisesta sama saidi ID ja uus võti. Poe laadimiseks võid väljad tühjaks jätta.</small>}
     <label>Wixi saidi ID<input value={wixSiteId} onChange={event => setWixSiteId(event.target.value)}
      autoComplete="off" spellCheck={false} maxLength={36} disabled={busy} required={needsWixCredentials} /></label>
     <label>Wixi API võti<input type="password" value={wixApiKey} onChange={event => setWixApiKey(event.target.value)}
      autoComplete="new-password" maxLength={4096} disabled={busy} required={needsWixCredentials} /></label>
    </>}
    <button type="submit" className="button" disabled={busy}>{busy ? 'Palun oota…' : 'Laadi tooted'}</button>
   </form>
   {catalog && <section className="panel product-section">
    <h2>Vali imporditavad tooted</h2>
    <p>Valitud tooted lisatakse mustandina. Pärast kinnitamist uuendatakse hinda ja saadavust e-poest.</p>
    {catalog.items.length ? <ul className="product-import-list">{catalog.items.map(item => {
     const imported = catalog.imported.includes(item.sourceId);
     return <li key={item.sourceId}><label>
      <input type="checkbox" disabled={busy || imported} checked={imported || checked.includes(item.sourceId)} onChange={event => {
       setChecked(old => event.target.checked ? [...old, item.sourceId] : old.filter(id => id !== item.sourceId));
      }} />
      <span><strong>{item.title}</strong><small>{imported ? 'Juba imporditud' : item.priceCents === null ? 'Vaata hinda e-poes' : formatServicePrice(item.priceCents)}</small></span>
     </label></li>;
    })}</ul> : <p>Sellel lehel pole imporditavaid avalikke tooteid.</p>}
    <div className="service-editor-actions">
     {catalog.cursor && <button type="button" className="button secondary" disabled={busy} onClick={() => void loadStore(connection, null)}>Esimene leht</button>}
     {catalog.next && <button type="button" className="button secondary" disabled={busy} onClick={() => void loadStore(connection, catalog.next)}>Järgmine leht</button>}
     <button type="button" className="button" disabled={busy || !checked.length} onClick={() => void run(async () => {
      const { items: imported } = await post<{ items: CompanyProduct[] }>({ action: 'import', shopId: catalog.shop.id, cursor: catalog.cursor, sourceIds: checked });
      setItems(old => [...imported, ...old]);
      setCatalog({ ...catalog, imported: [...new Set([...catalog.imported, ...checked])] });
      setChecked([]);
      setMessage(imported.length ? `Mustandina lisatud: ${imported.length}.` : 'Valitud tooted on juba imporditud.');
     })}>Impordi valitud tooted {checked.length > 0 && `(${checked.length})`}</button>
    </div>
   </section>}
  </>}
  {mode === 'help' && !helpSent && <form className="panel service-fields" onSubmit={sendHelp}>
   <p>Tasuline seadistusabi. Kirjelda oma poodi ja seda, milles abi vajad.</p>
   <fieldset className="product-help-fields service-fields" disabled={busy}>
    <label>E-poe link<input name="shopUrl" type="url" placeholder="https://sinupood.ee" maxLength={2048} required /></label>
    <label>E-post<input name="email" type="email" maxLength={254} required /></label>
    <label>Millega saadame aidata?<textarea name="message" rows={4} minLength={5} maxLength={1000} required /></label>
    <button type="submit" className="button">Küsi pakkumist</button>
   </fieldset>
  </form>}
 </>;
}

function Entry({ icon, title, children, onClick }: { icon: ReactNode; title: string; children: ReactNode; onClick: () => void }) {
 return <button type="button" className="panel product-entry" onClick={onClick}>
  <span className="product-entry-icon" aria-hidden="true">{icon}</span>
  <strong>{title}</strong><span>{children}</span><ArrowRight size={16} aria-hidden="true" />
 </button>;
}
