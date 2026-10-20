import { getPublicData } from '../../lib/data';
import { JobCard } from '../../components/job-card';
import { EmptyState } from '@leek/ui';
export const dynamic='force-dynamic';
export const metadata={title:'Tööpakkumised Loode-Eestis',alternates:{canonical:'/tookohad'}};
export default async function Jobs(){const data=await getPublicData();return <div className="container"><section className="page-intro"><span className="eyebrow">TÖÖTA KODUKANDIS</span><h1>Sinu järgmine võimalus.</h1><p>Avasta Loode-Eesti ettevõtete tööpakkumised. Hea töö võib olla lähemal, kui arvad.</p></section><section className="section"><div className="jobs-grid">{data.jobs.map(j=><JobCard key={j.id} job={j} company={data.companies.find(c=>c.id===j.companyId)}/>)}</div>{!data.jobs.length&&<EmptyState title="Uued võimalused lisanduvad peagi">Praegu aktiivseid töökuulutusi ei ole.</EmptyState>}</section></div>;}
