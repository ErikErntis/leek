import type { MetadataRoute } from 'next';
import { siteUrl } from '../lib/data';
export default function robots():MetadataRoute.Robots{return process.env.DEMO_MODE==='true'?{rules:{userAgent:'*',disallow:'/'}}:{rules:{userAgent:'*',allow:'/'},sitemap:siteUrl+'/sitemap.xml'};}
