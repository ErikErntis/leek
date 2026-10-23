'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Check, ImagePlus, LockKeyhole, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';
import { categories, employeeBands, profileSaveSchema, companyDisplayName, type OwnProfile, type PublicProfileInput } from '@leek/contracts';

function publicValues(data: OwnProfile): PublicProfileInput {
 const draft=data.revision && ['pending','rejected'].includes(data.revision.status) ? data.revision.content : null;
 if(draft)return {image:data.company.image,logo:data.company.logo??'',...draft,additionalCategories:[...draft.additionalCategories]};
 const c=data.company;
 return {image:c.image,logo:c.logo??'',name:c.name,brandName:c.brandName??'',category:c.category as PublicProfileInput['category'],additionalCategories:c.additionalCategories as PublicProfileInput['additionalCategories'],municipality:c.municipality,settlement:c.settlement,address:c.address,email:c.email,phone:c.phone,website:c.website,employees:c.employees as PublicProfileInput['employees'],tagline:c.tagline,description:c.description};
}
function Field({label,id,error,hint,children}:{label:string;id:string;error?:string;hint?:string;children:ReactNode}){
 return <div className="profile-field"><label htmlFor={id}>{label}</label>{children}{hint&&<small>{hint}</small>}{error&&<p className="profile-field-error" id={`${id}-error`}>{error}</p>}</div>;
}

export function CompanyProfileForm({initial}:{initial:OwnProfile}){
 const [data,setData]=useState(initial);
 const [values,setValues]=useState(()=>publicValues(initial));
 const [contact,setContact]=useState(()=>initial.company.contact??{name:'',role:'',email:'',phone:''});
 const [errors,setErrors]=useState<Record<string,string>>({});
 const [message,setMessage]=useState('');const [failure,setFailure]=useState('');const [busy,setBusy]=useState(false);
 const [uploading,setUploading]=useState(false);
 const pending=useRef(false);const form=useRef<HTMLFormElement>(null);const prefix=useId();
 const baseline=useRef(JSON.stringify({publicProfile:publicValues(initial),contact:initial.company.contact??{name:'',role:'',email:'',phone:''}}));
 const dirty=JSON.stringify({publicProfile:values,contact})!==baseline.current;
 const publicLocked=data.company.status==='pending';
 const displayName=companyDisplayName(values);
 const checks=[Boolean(values.name),Boolean(values.email),Boolean(values.tagline),Boolean(values.description),Boolean(values.municipality),Boolean(values.phone),Boolean(values.logo)];
 const completion=Math.round(checks.filter(Boolean).length/checks.length*100);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function update<K extends keyof PublicProfileInput>(key:K,value:PublicProfileInput[K]){
  setValues(old=>({...old,[key]:value,...(key==='category'?{additionalCategories:old.additionalCategories.filter(item=>item!==value)}:{})}));setMessage('');
 }
 function attributes(key:keyof PublicProfileInput){const path=`publicProfile.${key}`;return {id:`${prefix}-${path}`,name:path,'aria-invalid':Boolean(errors[path]),'aria-describedby':errors[path]?`${prefix}-${path}-error`:undefined};}
 function contactAttributes(key:keyof typeof contact){const path=`contact.${key}`;return {id:`${prefix}-${path}`,name:path,'aria-invalid':Boolean(errors[path]),'aria-describedby':errors[path]?`${prefix}-${path}-error`:undefined};}
 async function upload(kind:'image'|'logo',file?:File){
  if(!file||pending.current)return;
  if(file.size>5*1024*1024){setFailure('Pildi suurus võib olla kuni 5 MB.');return;}
  pending.current=true;setBusy(true);setUploading(true);setFailure('');
  try{
   const response=await fetch(`/api/portal/company/${data.company.id}/${kind}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file,signal:AbortSignal.timeout(30000)});
   const result=await response.json();if(!response.ok)throw new Error(result.error??'Üleslaadimine ebaõnnestus.');
   update(kind,result.url);setMessage('Pilt on üles laaditud. Esitamiseks vajuta „Salvesta muudatused”.');
  }catch(error){setFailure(error instanceof Error?error.message:'Üleslaadimine ebaõnnestus.');}
  finally{pending.current=false;setBusy(false);setUploading(false);}
 }
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(pending.current)return;setMessage('');setFailure('');
  const input=profileSaveSchema.safeParse({version:data.version,publicProfile:values,contact});
  if(!input.success){const next:Record<string,string>={};for(const issue of input.error.issues){const path=issue.path.join('.');const messages:Record<string,string>={'publicProfile.name':'Sisesta ettevõtte nimi (2–200 märki).','publicProfile.brandName':'Brändinimi võib olla kuni 120 märki.','publicProfile.tagline':'Lisa lühitutvustus (10–160 märki).','publicProfile.description':'Lisa kirjeldus (30–3000 märki).','publicProfile.category':'Vali põhikategooria.','publicProfile.additionalCategories':'Kontrolli lisakategooriaid.','publicProfile.employees':'Vali töötajate arv.','publicProfile.municipality':'Sisesta omavalitsus.','publicProfile.settlement':'Sisesta asula.','publicProfile.email':'Sisesta korrektne e-posti aadress.','publicProfile.website':'Sisesta täielik aadress, nt https://ettevote.ee.','contact.name':'Sisesta kontaktisiku nimi.','contact.email':'Sisesta korrektne e-posti aadress.'};next[path]=messages[path]??'Kontrolli selle välja väärtust.';}setErrors(next);const first=Object.keys(next)[0];requestAnimationFrame(()=>{const field=form.current?.elements.namedItem(first!);if(field instanceof HTMLElement)field.focus();});return;}
  pending.current=true;setBusy(true);setErrors({});
  try{
   const response=await fetch(`/api/portal/company/${data.company.id}/profile`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input.data),signal:AbortSignal.timeout(20000)});
   const result=await response.json();if(!response.ok)throw new Error(result.error??'Salvestamine ebaõnnestus.');
   const saved=result as OwnProfile;const next=publicValues(saved);const nextContact=saved.company.contact??contact;
   baseline.current=JSON.stringify({publicProfile:next,contact:nextContact});setData(saved);setValues(next);setContact(nextContact);
   setMessage(saved.revision?.status==='pending'?'Kontaktisik on salvestatud. Avalikud muudatused on esitatud ülevaatusele.':saved.company.status==='pending'?'Ettevõtte andmed on esitatud kinnitamiseks.':'Muudatused on salvestatud.');
  }catch(reason){setFailure(reason instanceof Error&&!['TypeError','TimeoutError'].includes(reason.name)?reason.message:'Ühendus ebaõnnestus. Sisestatud andmed on vormis alles.');}
  finally{pending.current=false;setBusy(false);}
 }
 function discard(){const old=JSON.parse(baseline.current) as {publicProfile:PublicProfileInput;contact:typeof contact};setValues(old.publicProfile);setContact(old.contact);setErrors({});setFailure('');setMessage('');}
 return <form ref={form} onSubmit={save} noValidate className="company-profile-form" aria-busy={busy}>
  <div className="profile-notice"><ShieldCheck size={20} aria-hidden="true"/><div><strong>{publicLocked?'Ettevõtte esmane taotlus on ülevaatamisel.':data.revision?.status==='pending'?'Sinu avalikud muudatused ootavad kinnitamist.':'Avalikud muudatused lähevad ülevaatusele.'}</strong><span>{publicLocked?'Avalikke andmeid saab muuta pärast halduri otsust. Kontaktisikut saad muuta kohe.':'Senine avalik profiil jääb seni nähtavaks. Kontaktisiku andmed salvestuvad kohe.'}</span></div></div>
  {data.revision?.status==='rejected'&&<p className="profile-feedback"><strong>Muudatused lükati tagasi:</strong> {data.revision.note}</p>}
  {data.company.status==='rejected'&&<p className="profile-feedback"><strong>Ettevõtte taotluse tagasiside:</strong> {data.company.reviewNote} Parandatud andmete salvestamine esitab taotluse uuesti.</p>}
  {message&&<p role="status" className="profile-success">{message}</p>}{failure&&<p role="alert" className="profile-feedback">{failure}</p>}
  <div className="profile-edit-grid"><div className="profile-edit-sections">
   <fieldset disabled={publicLocked||busy} className="profile-edit-card"><legend>Põhiandmed</legend><p>Juriidiline nimi tuvastab ettevõtte. Brändinimi on avalikult kuvatav nimi.</p><div className="profile-fields">
    <Field label="Ettevõtte juriidiline nimi" id={attributes('name').id} error={errors['publicProfile.name']}><input {...attributes('name')} value={values.name} onChange={e=>update('name',e.target.value)} maxLength={200} required/></Field>
    <Field label="Registrikood" id={`${prefix}-registry`} hint="Registrikoodi muutmiseks võta ühendust halduriga."><div className="profile-locked"><input id={`${prefix}-registry`} value={data.company.registrationCode} readOnly aria-readonly="true"/><LockKeyhole size={15} aria-hidden="true"/></div></Field>
    <Field label="Brändinimi / avalik nimi" id={attributes('brandName').id} error={errors['publicProfile.brandName']} hint="Vabatahtlik. Näiteks vello.ee. Tühjaks jättes kasutatakse juriidilist nime."><input {...attributes('brandName')} value={values.brandName} onChange={e=>update('brandName',e.target.value)} maxLength={120} placeholder="Näiteks vello.ee"/></Field>
    <Field label="Töötajate arv" id={attributes('employees').id} error={errors['publicProfile.employees']}><select {...attributes('employees')} value={values.employees} onChange={e=>update('employees',e.target.value as PublicProfileInput['employees'])}><option value="">Vali suurus</option>{employeeBands.map(item=><option key={item}>{item}</option>)}</select></Field>
    <Field label="Põhikategooria" id={attributes('category').id} error={errors['publicProfile.category']}><select {...attributes('category')} value={values.category} onChange={e=>update('category',e.target.value as PublicProfileInput['category'])}><option value="">Vali kategooria</option>{categories.map(item=><option key={item}>{item}</option>)}</select></Field>
    <div className="profile-field"><span className="profile-field-label">Lisakategooriad</span><div className="profile-category-options">{categories.filter(item=>item!==values.category).map(item=><label key={item}><input type="checkbox" checked={values.additionalCategories.includes(item)} onChange={e=>update('additionalCategories',e.target.checked?[...values.additionalCategories,item]:values.additionalCategories.filter(value=>value!==item))}/>{item}</label>)}</div>{errors['publicProfile.additionalCategories']&&<p className="profile-field-error">{errors['publicProfile.additionalCategories']}</p>}</div>
   </div></fieldset>
   <fieldset disabled={publicLocked||busy} className="profile-edit-card"><legend>Ettevõtte tutvustus</legend><p>Räägi lühidalt, kellele ja millega abiks oled.</p>
    <Field label="Lühitutvustus" id={attributes('tagline').id} error={errors['publicProfile.tagline']}><input {...attributes('tagline')} value={values.tagline} onChange={e=>update('tagline',e.target.value)} maxLength={160} required/><span className="profile-counter">{values.tagline.length}/160</span></Field>
    <Field label="Pikem kirjeldus" id={attributes('description').id} error={errors['publicProfile.description']}><textarea {...attributes('description')} value={values.description} onChange={e=>update('description',e.target.value)} maxLength={3000} rows={6} required/><span className="profile-counter">{values.description.length}/3000</span></Field>
   </fieldset>
   <fieldset disabled={publicLocked||busy} className="profile-edit-card"><legend>Asukoht ja avalikud kontaktid</legend><p>Need andmed kuvatakse sinu avalikul profiilil.</p><div className="profile-fields">{([['municipality','Omavalitsus'],['settlement','Asula'],['address','Aadress'],['website','Koduleht'],['email','E-post'],['phone','Telefon']] as const).map(([key,label])=><Field key={key} label={label} id={attributes(key).id} error={errors[`publicProfile.${key}`]}><input {...attributes(key)} value={values[key]} type={key==='email'?'email':key==='website'?'url':key==='phone'?'tel':'text'} onChange={e=>update(key,e.target.value)} placeholder={key==='website'?'https://ettevote.ee':undefined} maxLength={key==='website'?500:key==='email'?254:key==='phone'?30:200}/></Field>)}</div></fieldset>
   <fieldset disabled={busy} className="profile-edit-card"><legend>Kontaktisik <span className="profile-private"><LockKeyhole size={12} aria-hidden="true"/>Ainult haldurile</span></legend><p>Kontaktisiku andmeid avalikul profiilil ei kuvata.</p><div className="profile-fields">{([['name','Nimi'],['role','Roll / amet'],['email','E-post'],['phone','Telefon']] as const).map(([key,label])=><Field key={key} label={label} id={contactAttributes(key).id} error={errors[`contact.${key}`]}><input {...contactAttributes(key)} type={key==='email'?'email':key==='phone'?'tel':'text'} value={contact[key]} onChange={e=>{setContact(old=>({...old,[key]:e.target.value}));setMessage('');}} maxLength={key==='email'?254:key==='phone'?30:100} required={key==='name'||key==='email'}/></Field>)}</div></fieldset>
  </div><aside className="profile-edit-aside"><section className="profile-edit-card"><h2>Profiili eelvaade</h2><p>Nii näevad külastajad sinu ettevõtet pärast kinnitamist.</p><div className="profile-live-card"><img src={values.image||data.company.image} alt="Ettevõtte praegune kaanepilt" width={600} height={250}/><div className="profile-live-content"><span className="profile-monogram">{values.logo?<img src={values.logo} alt={`${displayName} logo`} style={{width:56,height:56,objectFit:'contain'}}/>:displayName.slice(0,2).toLocaleUpperCase('et')}</span><h3>{displayName}</h3><span className="badge">{values.category}</span><p><MapPin size={14} aria-hidden="true"/>{values.municipality}</p><p>{values.tagline}</p>{values.brandName&&<small>Ettevõte: {values.name}</small>}</div></div><fieldset className="profile-upload-options" disabled={busy||publicLocked}><legend>Pildid</legend>{(['image','logo'] as const).map(kind=><div key={kind}><label htmlFor={`${prefix}-${kind}`}><ImagePlus size={16}/>{kind==='image'?'Muuda kaanepilti':'Muuda logo'}</label><input id={`${prefix}-${kind}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{void upload(kind,event.target.files?.[0]);event.target.value='';}}/></div>)}{values.logo&&<button type="button" className="text-link" onClick={()=>update('logo','')}>Eemalda logo</button>}</fieldset><small className="muted">{uploading?'Laadin pilti üles…':'JPG, PNG või WebP, kuni 5 MB. Logo soovituslikult ruudukujuline, kaanepilt horisontaalne. Pärast üleslaadimist salvesta muudatused.'}</small></section><section className="profile-edit-card"><h2>Profiili täitmine</h2><p>Hea tutvustus aitab õigete inimesteni jõuda.</p><progress max={100} value={completion} aria-label="Profiili täitmine"/><strong>{completion}%</strong><ul className="profile-checks">{[[Boolean(values.name),'Põhiandmed lisatud'],[Boolean(values.email),'Kontaktid olemas'],[Boolean(values.description),'Tutvustus lisatud'],[Boolean(values.logo),'Ettevõtte logo lisatud']].map(([done,label])=><li key={String(label)}>{done?<Check size={17} aria-hidden="true"/>:<span className="profile-unchecked"/>}{label}</li>)}</ul></section></aside></div>
  <div className="profile-savebar"><span>{dirty?'Muudatused pole veel salvestatud':data.revision?.status==='pending'?'Avalikud muudatused ootavad kinnitamist':'Kõik muudatused on salvestatud'}</span><div><button type="button" className="button secondary" disabled={!dirty||busy} onClick={discard}>Loobu muudatustest</button><button type="submit" className="button" disabled={!dirty||busy}>{busy?'Salvestan…':'Salvesta muudatused'}<ArrowRight size={16} aria-hidden="true"/></button></div></div>
 </form>;
}
