import { ArrowRight, MapPin } from 'lucide-react';
import { companyDisplayName, formatServicePrice, type ServiceContent, type PublicService } from '@leek/contracts';

export function ServiceDetail({ service, company, preview = false }: { service: ServiceContent; company: Pick<PublicService['company'], 'name'> & Partial<PublicService['company']>; preview?: boolean }) {
 const Title = preview ? 'h2' : 'h1';
 const fixed = service.pricing === 'fixed';
 const name = companyDisplayName(company);
 const subject = (fixed ? 'Tellimus: ' : 'Hinnapäring: ') + service.title;
 const body = 'Tere!\n\nSoovin teenust „' + service.title + '“.\n\nTöö asukoht:\nSoovitud aeg:\nTöö kirjeldus:\n';
 const contactLabel = fixed ? 'Saada tellimissoov e-postiga' : 'Küsi pakkumist e-postiga';

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
     <p className="service-location"><MapPin size={14} aria-hidden="true" /> {service.area}</p>
    </div>
   </div>
   {service.photo && <img className="service-photo" src={service.photo} alt="Teenuse foto" width={720} height={405} />}
   <section className="service-description">
    <h2>Teenuse kirjeldus</h2>
    <p>{service.description || 'Teenuse kirjeldus lisatakse siia.'}</p>
   </section>
  </article>
  <aside className="panel service-price-panel">
   <p className="muted">Teenuse hind</p>
   <h2>{fixed ? (service.priceCents === null ? 'Hind määramata' : formatServicePrice(service.priceCents)) : 'Pakkumise alusel'}</h2>
   <p>{fixed ? 'Lisa töö asukoht ja soovitud aeg. Ettevõtja kinnitab tellimissoovi.' : 'Kirjelda tööd. Ettevõtja saadab sulle hinna ja pakub sobiva aja.'}</p>
   {company.email
    ? <a className="button" href={`mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>{contactLabel}<ArrowRight size={16} aria-hidden="true" /></a>
    : <button type="button" className="button" disabled>{contactLabel}</button>}
  </aside>
 </div>;
}

export function ServiceCards({ items }: { items: PublicService[] }) {
 return <ul className="service-cards">{items.map(service => <li key={service.id} className="panel">
  <p className="eyebrow">{service.category}</p>
  <h3><a href={`/teenused/${service.id}`}>{service.title}</a></h3>
  <p className="muted">{companyDisplayName(service.company)} · {service.area}</p>
  <strong>{service.priceCents === null ? 'Pakkumise alusel' : formatServicePrice(service.priceCents)}</strong>
 </li>)}</ul>;
}
