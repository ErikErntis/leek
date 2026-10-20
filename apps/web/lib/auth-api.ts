import 'server-only';

export function authApiURL(path: string) {
  if (!process.env.API_URL) throw new Error('API_URL is required for authentication');
  const origin = new URL(process.env.API_URL);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('API_URL must be an HTTP(S) origin');
  return new URL(`/api/auth/${path}`, origin);
}
