import type { MetadataRoute } from 'next';
import { getPublicData, siteUrl } from '../lib/data';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{if(process.env.DEMO_MODE==='true')return [];const d=await getPublicData();return [...['','/ettevotted','/pakkumised','/tookohad','/klubist','/liitu'].map(p=>({url:siteUrl+p})),...d.companies.map(c=>({url:siteUrl+'/ettevotted/'+c.slug})),...d.jobs.map(j=>({url:siteUrl+'/tookohad/'+j.slug}))];}
