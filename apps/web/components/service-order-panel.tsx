'use client';

import { useId, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { formatServicePrice, getServicePriceLabel, type ServiceContent } from '@leek/contracts';

export function ServiceOrderPanel({ service, email }: { service: ServiceContent; email?: string }) {
 const group = useId();
 const fixed = service.pricing === 'fixed';
 const packages = fixed ? service.packages ?? [] : [];
 const [selectedId, setSelectedId] = useState(packages[0]?.id);
 const selected = packages.find(item => item.id === selectedId) ?? packages[0];
 const packagePrice = selected?.priceCents;
 const subject = (fixed ? 'Tellimus: ' : 'Hinnapäring: ') + service.title.replace(/[\r\n]+/g, ' ');
 const packageLine = selected && packagePrice != null
  ? `\nPakett: ${selected.title} (${formatServicePrice(packagePrice)})\n`
  : '';
 const body = `Tere!\n\nSoovin teenust „${service.title}“.\n${packageLine}\nTöö asukoht:\nSoovitud aeg:\nTöö kirjeldus:\n`;
 const label = fixed ? 'Saada tellimissoov e-postiga' : 'Küsi pakkumist e-postiga';

 return <aside className="panel service-price-panel">
  {packages.length > 0 ? <fieldset className="service-package-choices">
   <legend>Vali pakett</legend>
   {packages.map((item, index) => <label className="service-package-choice" key={item.id}>
    <input type="radio" name={group} checked={selected?.id === item.id} onChange={() => setSelectedId(item.id)} />
    <span>
     <strong>{item.title || `Pakett ${index + 1}`}</strong>
     {item.description && <span className="service-package-description">{item.description}</span>}
     <span className="service-package-price">{item.priceCents === null ? 'Hind määramata' : formatServicePrice(item.priceCents)}</span>
    </span>
   </label>)}
  </fieldset> : <>
   <p className="muted">Teenuse hind</p>
   <h2>{getServicePriceLabel(service)}</h2>
  </>}
  <p>{fixed ? 'Lisa töö asukoht ja soovitud aeg. Ettevõtja kinnitab tellimissoovi.' : 'Kirjelda tööd. Ettevõtja saadab sulle hinna ja pakub sobiva aja.'}</p>
  {email && (!fixed || (selected ? packagePrice != null : service.priceCents !== null))
   ? <a className="button" href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>{label}<ArrowRight size={16} aria-hidden="true" /></a>
   : <button type="button" className="button" disabled>{label}</button>}
 </aside>;
}
