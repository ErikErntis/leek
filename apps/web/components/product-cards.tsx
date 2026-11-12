import { companyDisplayName, formatServicePrice, type PublicProduct } from '@leek/contracts';

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
export function ProductCards({ items }: { items: PublicProduct[] }) {
 return <ul className="service-cards product-cards">{items.map(item => <li key={item.id} className="panel">
  {item.content.photos[0] && <img className="product-card-photo" src={item.content.photos[0]} alt="" width={320} height={200} loading="lazy" referrerPolicy="no-referrer" />}
  <p className="eyebrow">{item.content.category}</p>
  <h3><a href={`/tooted/${item.id}`}>{item.content.title}</a></h3>
  <p className="muted">{companyDisplayName(item.company)}</p>
  <strong>{priceLabel(item)}</strong>
 </li>)}</ul>;
}
