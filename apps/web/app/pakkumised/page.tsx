import { getSiteContent } from '../../lib/site-content';
import { getPublicData } from '../../lib/data';
import { EmptyState } from '@leek/ui';
export const dynamic='force-dynamic';
export const metadata={title:'Kohalike ettevõtete pakkumised',alternates:{canonical:'/pakkumised'}};
export default async function Offers(){const [data, content]=await Promise.all([getPublicData(),getSiteContent()]);return <div className="container"><section className="page-intro"><span className="eyebrow">{content.offersEyebrow}</span><h1>{content.offersTitle}</h1><p>{content.offersLead}</p></section><section className="section"><div className="jobs-grid">{data.offers.map(o=>{const c=data.companies.find(c=>c.id===o.companyId);return <article key={o.id} className="offer-card"><span className="eyebrow">{c?.name}</span><h3>{o.title}</h3><p>{o.description}</p><a href={'/ettevotted/'+c?.slug} className="text-link">Vaata ettevõtet →</a></article>;})}</div>{!data.offers.length&&<EmptyState title="Uued pakkumised lisanduvad peagi"/>}</section></div>;}
