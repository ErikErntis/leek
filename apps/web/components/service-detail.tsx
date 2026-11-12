import { MapPin } from 'lucide-react';
import { companyDisplayName, getServiceAreas, getServicePriceLabel, type ServiceContent, type PublicService } from '@leek/contracts';
import { ServiceOrderPanel } from './service-order-panel';

export function ServiceDetail({ service, company, listingId, preview = false }: { service: ServiceContent; company: Pick<PublicService['company'], 'name'> & Partial<PublicService['company']>; listingId?: string; preview?: boolean }) {
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
  <ServiceOrderPanel service={service} listingId={listingId} />
 </div>;
}

export function ServiceCards({ items }: { items: PublicService[] }) {
 return <ul className="service-cards">{items.map(service => <li key={service.id} className="panel">
  <p className="eyebrow">{service.category}</p>
  <h3><a href={`/teenused/${service.id}`}>{service.title}</a></h3>
  <p className="muted">{companyDisplayName(service.company)} · {getServiceAreas(service).join(', ')}</p>
  <strong>{getServicePriceLabel(service)}</strong>
 </li>)}</ul>;
}
