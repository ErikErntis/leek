import { WorkspaceShell } from '@leek/ui';
import { getCompanies } from '../lib/data';
import { CompaniesTable } from './companies';
import { AdminLogout } from './admin-auth';
export async function CompanyList({status,offset,active}:{status:string;offset:number;active:string}) {
 const data=await getCompanies(status,offset);
 const href=(next:number)=>`${active}?status=${status}&offset=${next}`;
 return <WorkspaceShell kind="admin" active={active} siteUrl={process.env.SITE_URL} demo={false} actions={<AdminLogout/>}><div className="workspace-heading"><div><h1>{active==='/ulevaatus'?'Ettevõtete ülevaatus':'Ettevõtted'}</h1><p>Vaata esitatud andmeid ja otsusta ettevõtte avaldamine.</p></div></div><nav className="admin-tabs" aria-label="Ettevõtete staatus">{[['pending','Ootel'],['published','Kinnitatud'],['rejected','Tagasi lükatud'],['all','Kõik']].map(([key,title])=><a key={key} href={`${active}?status=${key}`} aria-current={status===key?'page':undefined}>{title}</a>)}</nav><section className="panel"><CompaniesTable items={data.items}/></section><div className="admin-pagination">{offset>0&&<a href={href(Math.max(0,offset-40))}>← Eelmised</a>}<span>Kuni 40 ettevõtet lehel</span>{data.hasMore&&<a href={href(offset+40)}>Järgmised →</a>}</div></WorkspaceShell>;
}
export function listQuery(query:Record<string,string|string[]|undefined>,fallback:string) {
 const status=typeof query.status==='string'&&['all','pending','published','rejected'].includes(query.status)?query.status:fallback;
 const n=Number(query.offset??0);return {status,offset:Number.isInteger(n)&&n>=0&&n<=100000?n:0};
}
