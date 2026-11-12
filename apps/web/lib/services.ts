import 'server-only';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { CompanyService, PublicService } from '@leek/contracts';
import { apiURL } from './portal';

export async function getOwnServices(companyId: string): Promise<CompanyService[]> {
 const response = await fetch(apiURL(`/v1/my/companies/${companyId}/services`), {
  headers: { cookie: (await cookies()).toString() }, cache: 'no-store', signal: AbortSignal.timeout(10000),
 });
 if (response.status === 404 || response.status === 403) notFound();
 if (!response.ok) throw new Error('Teenuseid ei saanud laadida.');
 return (await response.json()).items;
}

export async function getPublicServices(query = '', company = '', offset = 0): Promise<{ items: PublicService[]; hasMore: boolean }> {
 if (process.env.DEMO_MODE === 'true') return { items: [], hasMore: false };
 const params = new URLSearchParams({ q: query, company, offset: String(offset) });
 const response = await fetch(apiURL(`/v1/services?${params}`), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
 if (!response.ok) throw new Error('Teenuseid ei saanud laadida.');
 return response.json();
}

export async function getPublicService(id: string): Promise<PublicService> {
 if (process.env.DEMO_MODE === 'true' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) notFound();
 const response = await fetch(apiURL(`/v1/services/${id}`), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
 if (response.status === 404) notFound();
 if (!response.ok) throw new Error('Teenust ei saanud laadida.');
 return response.json();
}
