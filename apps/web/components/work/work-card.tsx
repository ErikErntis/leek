import { ArrowRight, BriefcaseBusiness, MapPin, Users } from 'lucide-react';
import { companyDisplayName, jobDetails, workKinds, workLoads, workModes, workPayLabel, type Company, type Job } from '@leek/contracts';

export function WorkCard({ job, company }: { job: Job; company: Company }) {
 const c = jobDetails(job), name = companyDisplayName(company);
 return <a className="work-card" href={`/tookohad/${job.slug}`}>
  <span className="work-company-logo">{company.logo ? <img src={company.logo} width={52} height={52} alt="" /> : name.slice(0, 2).toLocaleUpperCase('et')}</span>
  <span className="work-card-main"><span className="work-kind" data-kind={c.kind}>{workKinds[c.kind]}</span><h2>{job.title}</h2><span className="work-card-company">{name} <span>· <MapPin size={13} aria-hidden="true" /> {job.municipality || 'Kaugtöö'}</span></span></span>
  <span className="work-card-tags"><span><BriefcaseBusiness size={14} aria-hidden="true" />{c.kind === 'gig' ? c.duration || 'Tööamps' : workLoads[c.load]}</span><span>{c.kind === 'gig' ? <><Users size={14} aria-hidden="true" />{c.people} {c.people === 1 ? 'inimene' : 'inimest'}</> : workModes[c.mode]}</span></span>
  <span className="work-card-pay"><strong>{workPayLabel(c).replace(' bruto', '')}</strong>{(c.payMinCents !== null || c.payMaxCents !== null) && <small>bruto</small>}<small>Kuni {new Intl.DateTimeFormat('et-EE', { day: 'numeric', month: 'long', timeZone: 'Europe/Tallinn' }).format(new Date(job.expiresAt))}</small></span>
  <ArrowRight className="work-card-arrow" size={20} aria-hidden="true" />
 </a>;
}
