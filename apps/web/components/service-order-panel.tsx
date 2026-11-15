'use client';

import { useId, useState } from 'react';
import { formatServicePrice, getServicePriceLabel, type ServiceContent } from '@leek/contracts';
import { InquiryContactActions } from './inquiries/contact-actions';
import { inquiryEmailHref, startInquiryHref } from '../lib/inquiry-links';

export function ServiceOrderPanel({ service, listingId, email, signedIn = false }: { service: ServiceContent; listingId?: string; email?: string; signedIn?: boolean }) {
 const group = useId();
 const fixed = service.pricing === 'fixed';
 const packages = fixed ? service.packages ?? [] : [];
 const [selectedId, setSelectedId] = useState(packages[0]?.id);
 const selected = packages.find(item => item.id === selectedId) ?? packages[0];
 const packagePrice = selected?.priceCents;
 const label = fixed ? 'Saada tellimissoov' : 'Küsi pakkumist';

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
  {listingId && (!fixed || (selected ? packagePrice != null : service.priceCents !== null))
   ? <InquiryContactActions portalHref={startInquiryHref('service', listingId, selected?.id)}
      emailHref={inquiryEmailHref(email, service.title, selected ? `Pakett: ${selected.title}` : undefined)}
      signedIn={signedIn} portalLabel={label} />
   : <button type="button" className="button" disabled>{label}</button>}
 </aside>;
}
