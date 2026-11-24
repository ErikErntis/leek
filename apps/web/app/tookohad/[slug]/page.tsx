import { notFound } from 'next/navigation';
import { ArrowRight, MapPin, BriefcaseBusiness, CalendarDays } from 'lucide-react';
import { companyDisplayName, publicProjection, jobDetails, workKinds, workLoads, workModes, workPayLabel, type Job } from '@leek/contracts';
import { getPublicData } from '../../../lib/data';
import { startInquiryHref } from '../../../lib/inquiry-links';
import { WorkCard } from '../../../components/work/work-card';
import { WorkShare } from '../../../components/work/work-actions';
import '../work.css';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
 const { slug } = await params, data = publicProjection(await getPublicData());
 const job = data.jobs.find(j => j.slug === slug);
 return { title: job?.title ?? 'Tööpakkumist ei leitud', description: job?.description.slice(0, 160), alternates: { canonical: '/tookohad/' + slug } };
}
const date = (value: string) => new Intl.DateTimeFormat('et-EE', { dateStyle: 'long', timeZone: 'Europe/Tallinn' }).format(new Date(value));
export default async function JobDetail({ params }: Props) {
 const { slug } = await params, data = publicProjection(await getPublicData());
 const job = data.jobs.find(j => j.slug === slug); if (!job) notFound();
 const company = data.companies.find(c => c.id === job.companyId); if (!company) notFound();
 const c = jobDetails(job), name = companyDisplayName(company);
 let href: string | undefined, action = 'Kandideeri e-postiga', hint = 'Avaneb sinu e-posti rakendus.';
 if (job.details && c.contactMethod === 'portal') { href = startInquiryHref('work', job.id); action = 'Kandideeri LEEKis'; hint = 'Sisselogimisel saad saata tööandjale sõnumi ja jätkata vestlust portaalis.'; }
 else if (job.details && c.contactMethod === 'url') {
  try { const url = new URL(c.contactUrl); if (url.protocol === 'https:' && !url.username && !url.password) href = url.href; } catch { /* Invalid links are not actionable. */ }
  action = 'Kandideeri tööandja lehel'; hint = 'Avaneb tööandja kandideerimisleht.';
 } else {
  const email = job.details ? c.contactEmail : company.email;
  if (/^[^@,;\s]+@[^@,;\s]+$/.test(email)) href = `mailto:${encodeURIComponent(email).replace('%40', '@')}?subject=${encodeURIComponent(`Kandideerimine: ${job.title}`)}`;
 }
 const related = data.jobs.filter(j => j.id !== job.id).sort((a: Job, b: Job) => Number(jobDetails(b).category === c.category) - Number(jobDetails(a).category === c.category)).slice(0, 3);
 return <div className="container work-page work-detail-page">
  <nav className="work-breadcrumb" aria-label="Asukoht lehel"><a href="/tookohad">Tööpakkumised</a><span>/</span><span>{c.category}</span><span>/</span><span>{job.title}</span></nav>
  <div className="work-detail-layout"><article>
   <header className="work-detail-heading"><span className="work-kind" data-kind={c.kind}>{workKinds[c.kind]}</span><h1>{job.title}</h1>
    <div className="work-employer"><span className="work-company-logo">{company.logo ? <img src={company.logo} width={56} height={56} alt="" /> : name.slice(0, 2).toLocaleUpperCase('et')}</span><div><strong>{name}</strong><span>{job.municipality || 'Kaugtöö'}</span></div><a className="text-link" href={`/ettevotted/${company.slug}`}>Vaata ettevõtet ↗</a></div>
    <div className="work-meta"><span><BriefcaseBusiness size={16} />{workLoads[c.load]}</span><span><MapPin size={16} />{workModes[c.mode]}</span><span>{c.category}</span></div>
   </header>
   <section className="work-copy panel"><h2>Töö kirjeldus</h2><p>{job.description}</p>{c.requirements && <><h2>Ootame sinult</h2><p>{c.requirements}</p></>}{c.benefits && <><h2>Meie pakume</h2><p>{c.benefits}</p></>}
    {c.kind === 'gig' && <><h2>Tööampsu ajakava</h2><dl><div><dt>Algus</dt><dd>{c.startsOn ? date(c.startsOn + 'T12:00:00Z') : 'Kokkuleppel'}</dd></div>{c.endsOn && <div><dt>Lõpp</dt><dd>{date(c.endsOn + 'T12:00:00Z')}</dd></div>}{c.duration && <div><dt>Kestus</dt><dd>{c.duration}</dd></div>}<div><dt>Inimesi</dt><dd>{c.people}</dd></div></dl></>}
   </section>
  </article><aside className="work-detail-aside"><section className="panel work-apply"><span className="eyebrow">{c.payMinCents === null && c.payMaxCents === null ? 'TASU' : 'BRUTOTASU'}</span><h2>{workPayLabel(c).replace(' bruto', '')}</h2>
   <dl>{[[<MapPin key="map" size={18} />, 'Asukoht', [job.municipality, c.address].filter(Boolean).join(', ') || 'Kaugtöö'], [<BriefcaseBusiness key="bag" size={18} />, 'Koormus', workLoads[c.load]], [null, 'Töökorraldus', workModes[c.mode]], [<CalendarDays key="date" size={18} />, 'Kandideerimise tähtaeg', date(job.expiresAt)]].map(([icon, label, value]) => <div key={String(label)}><dt>{icon}{label}</dt><dd>{value}</dd></div>)}</dl>
   {href ? <a className="button" href={href} {...(c.contactMethod === 'url' && job.details ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{action}<ArrowRight size={17} /></a> : <p className="notice-panel">Kandideerimise kontakt puudub. Võta ühendust ettevõtte profiili kaudu.</p>}
   {href && <p className="muted">{hint}</p>}<WorkShare title={job.title} />
  </section><section className="work-about"><h2>Tööandjast</h2><h3>{name}</h3><p>{company.tagline || company.description.slice(0, 200)}</p><a className="text-link" href={`/ettevotted/${company.slug}`}>Tutvu ettevõttega <ArrowRight size={16} /></a></section></aside></div>
  {related.length > 0 && <section className="work-related"><h2>Vaata ka teisi võimalusi</h2><div>{related.map(j => <WorkCard key={j.id} job={j} company={data.companies.find(c => c.id === j.companyId)!} />)}</div></section>}
 </div>;
}
