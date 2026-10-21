import { CompanyList,listQuery } from '../../components/company-list';
export default async function Review({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){return <CompanyList {...listQuery(await searchParams,'pending')} active="/ulevaatus"/>;}
