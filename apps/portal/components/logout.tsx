'use client';
import {useState} from 'react';
export function Logout(){const [error,setError]=useState('');const [busy,setBusy]=useState(false);return <div><button type="button" className="text-link" disabled={busy} onClick={async()=>{setBusy(true);try{const response=await fetch('/api/logout',{method:'POST'});if(!response.ok)throw new Error();window.location.assign('/auth/start');}catch{setError('Väljalogimine ebaõnnestus.');setBusy(false);}}}>{busy?'Oota…':'Logi välja'}</button>{error&&<span role="alert">{error}</span>}</div>;}
