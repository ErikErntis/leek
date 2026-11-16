import { ArrowRight, MapPin } from 'lucide-react';
import { companyDisplayName, getServiceAreas, getServicePriceLabel, type ServiceContent, type PublicService } from '@leek/contracts';
import { ServiceOrderPanel } from './service-order-panel';

export function ServiceDetail({ service, company, listingId, signedIn = false, preview = false }: { service: ServiceContent; company: Pick<PublicService['company'], 'name'> & Partial<PublicService['company']>; listingId?: string; signedIn?: boolean; preview?: boolean }) {
 const Title = preview ? 'h2' : 'h1';
 const name = companyDisplayName(company);

 return <div className="service-detail-grid">
  <article className="service-detail">
   <p className="eyebrow">{service.category}</p>
   <Title className="service-detail-title">{service.title || 'Teenuse nimi'}</Title>
   <div className="service-provider">
    <span className="service-provider-logo">
     {company.logo ? <img src={company.logo} alt="" width={42} height={42} /> : name.slice(0, 2).toLocaleUpperCase('et')}
    </span>
    <div>
     {company.slug ? <a className="text-link" href={`/ettevotted/${company.slug}`}>{name}</a> : <strong>{name}</strong>}
     <p className="service-location"><MapPin size={14} aria-hidden="true" /> {getServiceAreas(service).join(', ')}</p>
    </div>
   </div>
   {service.photo && <img className="service-photo" src={service.photo} alt="Teenuse foto" width={720} height={405} />}
   <section className="service-description">
    <h2>Teenuse kirjeldus</h2>
    <p>{service.description || 'Teenuse kirjeldus lisatakse siia.'}</p>
   </section>
  </article>
  <ServiceOrderPanel service={service} listingId={listingId} email={company.email} signedIn={signedIn} />
 </div>;
}

export function ServiceCards({ items, catalog = false }: { items: PublicService[]; catalog?: boolean }) {
 return <ul className={catalog ? 'catalog-grid' : 'service-cards'}>{items.map(service => {
  const provider = companyDisplayName(service.company);
  const areas = getServiceAreas(service).join(', ');
  const price = getServicePriceLabel(service);
  return <li key={service.id} className={catalog ? 'panel catalog-card' : 'panel'}>
   {catalog && service.photo && <img className="catalog-card-photo" src={service.photo} alt="" width={320} height={200} loading="lazy" />}
   <div className={catalog ? 'catalog-card-body' : undefined}>
    <p className="eyebrow">{service.category}</p>
    <h3><a href={`/teenused/${service.id}`}>{service.title}</a></h3>
    {catalog ? <>
     <p className="muted">{provider}</p>
     <p className="catalog-area"><MapPin size={14} aria-hidden="true" />{areas}</p>
     <div className="catalog-card-footer"><strong>{price}</strong><ArrowRight size={17} aria-hidden="true" /></div>
    </> : <>
     <p className="muted">{provider} · {areas}</p>
     <strong>{price}</strong>
    </>}
   </div>
  </li>;
 })}</ul>;
}
