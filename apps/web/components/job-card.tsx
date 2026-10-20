import { BriefcaseBusiness, ArrowUpRight } from 'lucide-react';
import type { Job, Company } from '@leek/contracts';
export function JobCard({job,company}:{job:Job;company:Company|undefined}){return <a href={'/tookohad/'+job.slug} className="job-card"><span className="job-icon"><BriefcaseBusiness size={25}/></span><div><small>{company?.name??'Ettevõte'}</small><h3>{job.title}</h3><small>{job.municipality} · {job.type}</small></div><ArrowUpRight size={21}/></a>;}
