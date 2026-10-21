import { CompanyList,listQuery } from '../../components/company-list';
export default async function Companies({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){return <CompanyList {...listQuery(await searchParams,'all')} active="/ettevotted"/>;}
