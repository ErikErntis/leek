import 'server-only';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { OwnWork } from '@leek/contracts';
import { apiURL } from './portal';

export async function getOwnWork(companyId: string): Promise<OwnWork> {
 const response = await fetch(apiURL(`/v1/my/companies/${companyId}/work`), {
  headers: { cookie: (await cookies()).toString() }, cache: 'no-store', signal: AbortSignal.timeout(10000),
 });
 if (response.status === 404 || response.status === 403) notFound();
 if (!response.ok) throw new Error('Töökuulutusi ei saanud laadida. Proovi uuesti.');
 return response.json();
}
