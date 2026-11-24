'use client';
import { useState } from 'react';
import { Share2 } from 'lucide-react';
export function WorkShare({ title }: { title: string }) {
 const [message, setMessage] = useState('');
 async function share() {
  try {
   if (navigator.share) await navigator.share({ title, url: location.href });
   else { await navigator.clipboard.writeText(location.href); setMessage('Link kopeeritud.'); }
  } catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) setMessage('Kopeeri kuulutuse link brauseri aadressiribalt.'); }
 }
 return <><button className="button secondary" type="button" onClick={share}><Share2 size={16} />Jaga kuulutust</button><span role="status" className="muted">{message}</span></>;
}
export function WorkSort({ value }: { value: string }) {
 return <label className="work-sort">Sordi <select name="sort" defaultValue={value} onChange={event => event.currentTarget.form?.requestSubmit()}><option value="recent">Uuemad ees</option><option value="deadline">Tähtaeg lähemal</option></select></label>;
}
