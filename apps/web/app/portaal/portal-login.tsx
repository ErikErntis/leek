'use client';
import {useState,type FormEvent} from 'react';
export function PortalLogin(){
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');const data=new FormData(event.currentTarget);
 try{const response=await fetch('/api/auth/sign-in/email',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:data.get('email'),password:data.get('password')})});if(!response.ok){setError(response.status===401?'E-post või parool on vale.':'Sisselogimine ebaõnnestus. Proovi uuesti.');setBusy(false);return;}window.location.reload();}catch{setError('Teenusega ühendamine ebaõnnestus.');setBusy(false);}}
 return <section className="container section" style={{maxWidth:520}}><h1 style={{fontSize:36}}>Logi portaali sisse</h1><p>Kasuta oma olemasolevat LEEKi kontot.</p><form onSubmit={submit} className="panel"><label>E-post<input name="email" type="email" autoComplete="email" required style={{display:'block',width:'100%',marginBottom:18}}/></label><label>Parool<input name="password" type="password" autoComplete="current-password" required style={{display:'block',width:'100%',marginBottom:18}}/></label>{error&&<p role="alert">{error}</p>}<button className="button" disabled={busy}>{busy?'Login sisse…':'Logi sisse'}</button></form></section>;
}
