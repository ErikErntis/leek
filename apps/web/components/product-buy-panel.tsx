'use client';

import { useId, useState } from 'react';
import { ArrowUpRight, Mail } from 'lucide-react';
import { formatServicePrice, productAvailability, type PublicProduct } from '@leek/contracts';

export function ProductBuyPanel({ product }: { product: PublicProduct }) {
 const { content, availability, linked, fromPrice, company } = product;
 const group = useId();
 const [selectedId, setSelected] = useState(content.variants[0]?.id);
 const selected = content.variants.find(variant => variant.id === selectedId) ?? content.variants[0];
 const price = selected ? selected.priceCents : content.priceCents;
 const stock = selected ? selected.availability : availability;
 const subject = 'Tootepäring: ' + content.title.replace(/[\r\n]+/g, ' ');
 const body = `Tere!\n\nSoovin küsida toote „${content.title}“ kohta.${selected ? `\nVariant: ${selected.name}` : ''}\n`;

 return <aside className="panel service-price-panel">
  {content.variants.length > 0 && <fieldset className="service-package-choices">
   <legend>Vali variant</legend>
   {content.variants.map(item => <label className="service-package-choice" key={item.id}>
    <input type="radio" name={group} checked={selected?.id === item.id} onChange={() => setSelected(item.id)} />
    <span><strong>{item.name}</strong><span className="muted">{productAvailability[item.availability]}</span></span>
   </label>)}
  </fieldset>}
  <h2>{price === null ? content.shopUrl ? 'Vaata hinda e-poes' : linked ? 'Hind pole saadaval' : 'Küsi hinda' : (fromPrice ? 'Alates ' : '') + formatServicePrice(price)}</h2>
  {stock && <p className="muted">{productAvailability[stock]}</p>}
  {content.shopUrl ? <a className="button" href={content.shopUrl} rel="noopener noreferrer">
   {stock === 'sold_out' ? 'Vaata e-poes' : 'Osta e-poest'} <ArrowUpRight size={16} aria-hidden="true" />
  </a> : linked ? <p>Tootelink pole praegu saadaval.</p> :
   <a className="button" href={`mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>Küsi toote kohta <Mail size={16} aria-hidden="true" /></a>}
 </aside>;
}
