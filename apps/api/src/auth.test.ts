import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@leek/db/schema';
import { createAuth } from '@leek/auth/server';
import { createApp } from './app';
import { demoData } from '@leek/contracts/demo';

test('real auth: migrations, signup, cookies, credentials, revocation, origins and limits', async () => {
  const client = new PGlite();
  try {
    await client.exec(await readFile(new URL('../../../packages/db/migrations/0000_stormy_paibok.sql', import.meta.url), 'utf8'));
    const existingId = '10000000-0000-4000-8000-000000000099';
    await client.query('INSERT INTO users (id,name,email) VALUES ($1,$2,$3)', [existingId, 'Olemasolev', 'existing@example.ee']);
    await client.exec(await readFile(new URL('../../../packages/db/migrations/0001_flaky_nebula.sql', import.meta.url), 'utf8'));
    const existing = await client.query<{ id: string; email_verified: boolean }>('SELECT id,email_verified FROM users WHERE id=$1', [existingId]);
    assert.equal(existing.rows[0]!.id, existingId);
    assert.equal(existing.rows[0]!.email_verified, false);
    const db = drizzle(client, { schema });
    const auth = createAuth(db as unknown as Parameters<typeof createAuth>[0], {
      publicURL: 'https://leek.test', secret: 'test-only-secret-with-at-least-32-characters-DO-NOT-DEPLOY',
    });
    const app = createApp({ readPublic: async () => structuredClone(demoData), check: async () => {} }, [], auth);
    async function request(path: string, body?: object, cookie?: string, origin = 'https://leek.test', ip = '198.51.100.1') {
      return app.request(`https://leek.test/api/auth/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Forwarded-For': ip, 'X-Leek-Auth-IP': ip, ...(cookie ? { Cookie: cookie } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    }
    const credentials = { name: '  Mari Maasikas  ', email: 'mari@example.ee', password: 'Correct-test-password-42', role: 'admin' };
    const denied = await request('sign-up/email', credentials, undefined, 'https://evil.test');
    assert.equal(denied.status, 403);
    const signup = await request('sign-up/email', credentials);
    assert.equal(signup.status, 200, await signup.clone().text());
    const cookies = signup.headers.getSetCookie();
    const sessionCookie = cookies.find(value => value.startsWith('__Secure-leek.session_token='));
    assert.ok(sessionCookie);
    assert.match(sessionCookie, /HttpOnly/i);
    assert.match(sessionCookie, /Secure/i);
    assert.match(sessionCookie, /SameSite=Lax/i);
    assert.doesNotMatch(sessionCookie, /Domain=/i);
    const cookie = sessionCookie.split(';')[0]!;
    const account = await client.query<{ password: string; role: string; name: string }>('SELECT a.password,u.role,u.name FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE u.email=$1', [credentials.email]);
    assert.notEqual(account.rows[0]!.password, credentials.password);
    assert.ok(account.rows[0]!.password.length > 40);
    assert.equal(account.rows[0]!.role, 'member');
    assert.equal(account.rows[0]!.name, 'Mari Maasikas');
    const session = await (await request('get-session?disableRefresh=true', undefined, cookie)).json();
    assert.equal(session.user.email, credentials.email);
    assert.equal(await (await request('get-session', undefined, '__Secure-leek.session_token=forged')).json(), null);
    assert.equal(await (await request('get-session')).json(), null);
    assert.equal((await request('sign-in/email', { email: credentials.email, password: 'wrong-password' })).status, 401);
    const duplicate = await request('sign-up/email', credentials);
    assert.ok(duplicate.status >= 400);
    assert.equal((await client.query('SELECT * FROM users WHERE email=$1', [credentials.email])).rows.length, 1);
    const login = await request('sign-in/email', credentials);
    assert.equal(login.status, 200);
    const loginCookie = login.headers.getSetCookie().find(value => value.startsWith('__Secure-leek.session_token='))!.split(';')[0]!;
    assert.equal((await request('sign-out', {}, loginCookie)).status, 200);
    assert.equal(await (await request('get-session', undefined, loginCookie)).json(), null);
    // Expired sessions cannot authorize a page either.
    await client.exec("UPDATE auth_sessions SET expires_at = now() - interval '1 day'");
    assert.equal(await (await request('get-session', undefined, cookie)).json(), null);
    // Changing attacker-controlled forwarded headers cannot reset the shared bucket.
    let limited = false;
    for (let index = 0; index < 12; index++) {
      const response = await request('sign-up/email', { name: 'x', email: `limit${index}@example.ee`, password: 'test-password-42' }, undefined, 'https://leek.test', `198.51.100.${index + 10}`);
      if (response.status === 429) { limited = true; break; }
    }
    assert.equal(limited, true);
  } finally { await client.close(); }
});
