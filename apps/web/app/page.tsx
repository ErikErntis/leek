import { ArrowRight, Hammer, Utensils, Users, Factory, ShoppingBag, MoveUpRight, Sprout } from 'lucide-react';
import { CompanyCard } from '@leek/ui';
import { getPublicData } from '../lib/data';
import { getSiteContent } from '../lib/site-content';
import { SearchForm } from '../components/search';
import { JobCard } from '../components/job-card';

export const dynamic = 'force-dynamic';
export const metadata = { alternates: { canonical: '/' } };
const categoryLinks = [['Ehitus', Hammer], ['Toitlustus ja majutus', Utensils], ['Teenused', Users], ['Tootmine', Factory], ['Jaemüük', ShoppingBag]] as const;

export default async function Home() {
 const [data, content] = await Promise.all([getPublicData(), getSiteContent()]);
 const featured = data.companies.filter(company => company.featured).slice(0, 3);
 return <div className="container">
  {content.heroVisible && <section className="hero">
   <div className="hero-copy">
    <span className="eyebrow">{content.heroEyebrow}</span>
    <h1>{content.heroTitle}<br /><span>{content.heroHighlight}</span></h1>
    <p>{content.heroDescription}</p>
    <div className="hero-signature"><i />{content.heroSignature}</div>
   </div>
   <div className="hero-images">
    <div className="hero-main site-hero-photo"><img src={content.heroImage} alt={content.heroImageAlt} width={780} height={580} /></div>
    <div className="hero-coast site-hero-photo">
     <img src={content.coastImage} alt={content.coastImageAlt} width={400} height={320} />
     <span className="site-copy-lines">{content.coastText}</span>
    </div>
    <div className="hero-note"><Sprout size={27} /><p className="site-copy-lines">{content.heroNote}</p><small>{content.heroNoteCaption}</small></div>
   </div>
  </section>}
  {content.searchVisible && <SearchForm title={content.searchButton} placeholder={content.searchPlaceholder} />}
  {content.categoriesVisible && <div className="category-strip">
   {categoryLinks.map(([label, Icon]) => <a key={label} href={'/ettevotted?category=' + encodeURIComponent(label)}>
    <Icon size={29} strokeWidth={1.5} />{label}<ArrowRight size={13} />
   </a>)}
  </div>}
  {content.companiesVisible && <section className="section">
   <div className="section-heading"><div><span className="eyebrow">{content.companiesEyebrow}</span><h2>{content.companiesTitle}</h2></div>
    <a href={content.companiesLink} className="text-link">{content.companiesButton} <ArrowRight size={16} /></a>
   </div>
   <div className="company-grid">{featured.map(company => <CompanyCard key={company.id} company={company} />)}</div>
   {!featured.length && <p className="muted">{content.companiesEmpty}</p>}
  </section>}
  {content.bannerVisible && <section className="community-banner">
   <div><span className="eyebrow">{content.bannerEyebrow}</span><h2>{content.bannerTitle}</h2><p>{content.bannerDescription}</p></div>
   <a href={content.bannerLink} className="button">{content.bannerButton} <MoveUpRight size={18} /></a>
  </section>}
  {content.jobsVisible && <section className="section">
   <div className="section-heading">
    <div><span className="eyebrow">{content.jobsEyebrow}</span><h2>{content.jobsTitle}</h2><p>{content.jobsDescription}</p></div>
    <a href={content.jobsLink} className="text-link">{content.jobsButton} <ArrowRight size={16} /></a>
   </div>
   <div className="jobs-grid">{data.jobs.slice(0, 4).map(job => <JobCard key={job.id} job={job} company={data.companies.find(company => company.id === job.companyId)} />)}</div>
   {!data.jobs.length && <p className="muted">{content.jobsEmpty}</p>}
  </section>}
 </div>;
}
