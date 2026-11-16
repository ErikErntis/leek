import { ArrowRight, Package } from 'lucide-react';
import { companyDisplayName, formatServicePrice, productAvailability, type PublicProduct } from '@leek/contracts';

function priceLabel({ content, fromPrice, linked }: PublicProduct) {
 const prices = content.variants.flatMap(item => item.priceCents === null ? [] : [item.priceCents]);
 if (prices.length) {
  const min = Math.min(...prices);
  return (prices.some(price => price !== min) ? 'Alates ' : '') + formatServicePrice(min);
 }
 if (content.priceCents !== null) return (fromPrice ? 'Alates ' : '') + formatServicePrice(content.priceCents);
 if (content.shopUrl) return 'Vaata hinda e-poes';
 return linked ? 'Hind pole saadaval' : 'Küsi hinda';
}
export function ProductCards({ items, catalog = false }: { items: PublicProduct[]; catalog?: boolean }) {
 return <ul className={catalog ? 'catalog-grid' : 'service-cards product-cards'}>{items.map(item => <li key={item.id} className={catalog ? 'panel catalog-card' : 'panel'}>
  {item.content.photos[0] ? <img className="product-card-photo" src={item.content.photos[0]} alt="" width={320} height={200} loading="lazy" referrerPolicy="no-referrer" /> :
   catalog && <div className="catalog-no-photo" aria-hidden="true"><Package size={30} /></div>}
  <div className={catalog ? 'catalog-card-body' : undefined}>
   <p className="eyebrow">{item.content.category}</p>
   <h3><a href={`/tooted/${item.id}`}>{item.content.title}</a></h3>
   <p className="muted">{companyDisplayName(item.company)}</p>
   {catalog && item.availability && <p className="catalog-stock" data-stock={item.availability}>{productAvailability[item.availability]}</p>}
   {catalog ? <div className="catalog-card-footer"><strong>{priceLabel(item)}</strong><ArrowRight size={17} aria-hidden="true" /></div> :
    <strong>{priceLabel(item)}</strong>}
  </div>
 </li>)}</ul>;
}
