import { betterAuth } from 'better-auth';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { users, authSessions, authAccounts, authVerifications, authRateLimits, type createDatabase } from '@leek/db';

export function createAuth(db: ReturnType<typeof createDatabase>['db'], config: { secret: string; publicURL: string; adminURL?: string; portalURL?: string }) {
  if (config.secret.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
  const url = new URL(config.publicURL);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('BETTER_AUTH_URL must be the web origin without a path');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Auth requires HTTPS outside local development');

  const trustedOrigins = [url.origin];
  for (const allowedURL of [config.adminURL, config.portalURL].filter((value): value is string => Boolean(value))) {
    const admin = new URL(allowedURL);
    if (admin.pathname !== '/' || admin.search || admin.hash || admin.username || admin.password || (admin.protocol !== 'https:' && !(admin.protocol === 'http:' && ['localhost','127.0.0.1'].includes(admin.hostname)))) throw new Error('ADMIN_URL/PORTAL_URL must be a valid HTTPS origin (HTTP allowed locally)');
    trustedOrigins.push(admin.origin);
  }
  return betterAuth({
    appName: 'LEEK',
    secret: config.secret,
    baseURL: url.origin,
    basePath: '/api/auth',
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user: users, session: authSessions, account: authAccounts, verification: authVerifications, rateLimit: authRateLimits },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128, autoSignIn: true },
    session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    advanced: {
      database: { generateId: 'uuid' },
      cookiePrefix: 'leek',
      useSecureCookies: url.protocol === 'https:',
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
      // The Hono boundary replaces this header; never trust a browser-supplied value.
      ipAddress: { ipAddressHeaders: ['x-leek-auth-ip'] },
    },
    rateLimit: {
      enabled: true, storage: 'database', window: 60, max: 120,
      customRules: {
        '/sign-up/email': { window: 60, max: 10 },
        '/sign-in/email': { window: 60, max: 20 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async context => {
        if (context.path === '/sign-up/email' || context.path === '/sign-in/email') {
          const email = typeof context.body?.email === 'string' ? context.body.email.trim() : '';
          if (!email || email.length > 254) throw new APIError('BAD_REQUEST', { message: 'Kontrolli e-posti aadressi.' });
          context.body.email = email;
        }
        if (context.path === '/sign-up/email') {
          const name = typeof context.body?.name === 'string' ? context.body.name.trim() : '';
          if (name.length < 2 || name.length > 100) throw new APIError('BAD_REQUEST', { message: 'Nimi peab olema 2–100 märki pikk.' });
          context.body.name = name;
        }
      }),
    },
  });
}
