import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { authApiURL } from './auth-api';

export type WebSession = { user: { id: string; name: string; email: string } };

/** Verify the signed cookie against the API/database on every request; no cookie-only grant. */
export const getSession = cache(async (): Promise<WebSession | null> => {
  const cookie = (await headers()).get('cookie');
  if (!cookie || !/(?:^|;\s*)(?:__Secure-)?leek\.session_token=/.test(cookie)) return null;
  const url = authApiURL('get-session');
  url.searchParams.set('disableRefresh', 'true');
  const response = await fetch(url, { headers: { cookie }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Sessiooni kontrollimine ebaõnnestus. Proovi uuesti.');
  const data = await response.json();
  if (!data) return null;
  if (typeof data.user?.id !== 'string' || typeof data.user?.name !== 'string' || typeof data.user?.email !== 'string' || !data.session?.expiresAt) throw new Error('Vigane sessiooni vastus');
  if (new Date(data.session.expiresAt).getTime() <= Date.now() || !Number.isFinite(new Date(data.session.expiresAt).getTime())) return null;
  return { user: { id: data.user.id, name: data.user.name, email: data.user.email } };
});
