import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { WorkspaceShell } from '@leek/ui';
import { categories, type PublicProfileInput } from '@leek/contracts';
export const dynamic='force-dynamic';
export const metadata={title:'Profiilimuudatuste ülevaatus',robots:{index:false,follow:false}};
async function api(path:string,body?:unknown){
 const response=await fetch(new URL(path,process.env.API_URL),{method:body?'POST':'GET',headers:{cookie:(await headers()).get('cookie')??'',origin:new URL(process.env.ADMIN_URL!).origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(response.status===401)redirect('/logi-sisse');
 if(response.status===403)throw new Error('Sul puudub administraatori ligipääs.');
 if(!response.ok)throw new Error('Muudatuse töötlemine ebaõnnestus. Värskenda järjekorda.');
 return response.json();
}
const labels:Record<keyof PublicProfileInput,string>={image:'Kaanepilt',logo:'Logo',name:'Juriidiline nimi',brandName:'Brändinimi',category:'Põhikategooria',additionalCategories:'Lisakategooriad',municipality:'Omavalitsus',settlement:'Asula',address:'Aadress',email:'Avalik e-post',phone:'Avalik telefon',website:'Koduleht',employees:'Töötajate arv',tagline:'Lühitutvustus',description:'Kirjeldus'};
async function decide(form:FormData){
 'use server';
 const id=String(form.get('id')??'');const decision=String(form.get('decision')??'');const note=String(form.get('note')??'').trim();
 if(!/^[a-f0-9-]{36}$/i.test(id)||!['approve','reject'].includes(decision)||note.length>1000||(decision==='reject'&&note.length<5))redirect('/profiilimuudatused?invalid=1');
 await api(`/v1/admin/profile-revisions/${id}/review`,{decision,note});
 redirect('/profiilimuudatused?done=1');
}
export default async function ProfileReviews({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 await api('/v1/admin/access');
 const query=await searchParams;
 const list=await api('/v1/admin/profile-revisions') as {items:{id:string;companyId:string;name:string;brandName:string;createdAt:string}[]};
 const id=typeof query.id==='string'&&/^[a-f0-9-]{36}$/i.test(query.id)?query.id:undefined;
 const detail=id?await api(`/v1/admin/profile-revisions/${id}`) as {id:string;status:string;companyName:string;before:PublicProfileInput;after:PublicProfileInput}:null;
 return <WorkspaceShell kind="admin" active="/profiilimuudatused" demo={false} siteUrl={process.env.SITE_URL}><div className="workspace-heading"><div><h1>Profiilimuudatused</h1><p>Avalik profiil muutub alles pärast kinnitamist.</p><a href="/ulevaatus" className="text-link">Ettevõtete taotlused →</a></div></div>{query.done&&<p role="status">Otsus on salvestatud.</p>}{query.invalid&&<p role="alert">Tagasilükkamisel lisa vähemalt 5 märgi pikkune põhjus.</p>}<section className="panel"><h2>Ootel muudatused ({list.items.length})</h2>{!list.items.length?<p>Järjekord on tühi.</p>:<ul>{list.items.map(item=><li key={item.id}><a className="text-link" href={`/profiilimuudatused?id=${item.id}`}>{item.brandName||item.name} · {new Intl.DateTimeFormat('et-EE').format(new Date(item.createdAt))}</a></li>)}</ul>}</section>{detail&&<section className="panel" style={{marginTop:24}}><h2>{detail.companyName}</h2><p>Staatus: {detail.status}</p><div className="table-wrap"><table><thead><tr><th>Väli</th><th>Praegu avalik</th><th>Esitatud muudatus</th></tr></thead><tbody>{(Object.keys(labels) as (keyof PublicProfileInput)[]).filter(key=>JSON.stringify(detail.before[key])!==JSON.stringify(detail.after[key])).map(key=><tr key={key}><th>{labels[key]}</th><td style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{(key==='image'||key==='logo')&&detail.before[key]?<img src={String(detail.before[key])} alt={labels[key]} style={{maxWidth:240,maxHeight:150,objectFit:'contain'}}/>:String(detail.before[key]??'')||'—'}</td><td style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{(key==='image'||key==='logo')&&detail.after[key]?<img src={String(detail.after[key])} alt={labels[key]} style={{maxWidth:240,maxHeight:150,objectFit:'contain'}}/>:String(detail.after[key]??'')||'—'}</td></tr>)}</tbody></table></div>{detail.status==='pending'&&<form action={decide}><input type="hidden" name="id" value={detail.id}/><label>Halduri märkus (tagasilükkamisel kohustuslik)<textarea name="note" maxLength={1000} rows={3} style={{display:'block',width:'100%',margin:'12px 0'}}/></label><button className="button" name="decision" value="approve">Kinnita muudatused</button>{' '}<button className="button secondary" name="decision" value="reject">Lükka tagasi</button></form>}</section>}</WorkspaceShell>;
}
