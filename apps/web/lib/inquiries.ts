import 'server-only';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { InquirySummary, InquiryThread } from '@leek/contracts';
import { apiURL } from './portal';
import { getSession } from './session';

export async function requireInquirySession(destination: string) {
 if (!await getSession()) redirect(`/logi-sisse?next=${encodeURIComponent(destination)}`);
}
async function fetchInbox<T>(id?: string, company?: string, offset = 0): Promise<T> {
 if (id && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) notFound();
 const url = apiURL(id ? `/v1/my/inquiries/${id}` : '/v1/my/inquiries');
 if (company) url.searchParams.set('company', company);
 if (offset) url.searchParams.set('offset', String(offset));
 const response = await fetch(url, {
  headers: { cookie: (await headers()).get('cookie') ?? '' }, cache: 'no-store', signal: AbortSignal.timeout(10000),
 });
 if (response.status === 404) notFound();
 if (response.status === 401) {
  const next = company ? '/portaal/paringud' : '/minu-paringud';
  redirect(`/logi-sisse?next=${encodeURIComponent(next)}`);
 }
 if (!response.ok) throw new Error('Päringuid ei saanud laadida.');
 return response.json();
}
export function getInquiries(company?: string, offset = 0) {
 return fetchInbox<{ items: InquirySummary[]; nextOffset: number | null }>(undefined, company, offset);
}
export function getInquiry(id: string, company?: string, offset = 0) {
 return fetchInbox<InquiryThread>(id, company, offset);
}
