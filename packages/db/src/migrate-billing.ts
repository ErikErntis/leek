import { createDatabase } from './index';
import { sql } from 'drizzle-orm';
export const billingMigration = `
ALTER TABLE companies ADD COLUMN IF NOT EXISTS paid_until timestamptz;
CREATE TABLE IF NOT EXISTS billing_checkouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 plan plan NOT NULL, amount integer NOT NULL CHECK (amount > 0), status text NOT NULL DEFAULT 'pending',
 stripe_session_id text UNIQUE, paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS billing_checkouts_company_idx ON billing_checkouts(company_id);
CREATE TABLE IF NOT EXISTS portal_tickets (token_hash text PRIMARY KEY, cookie text NOT NULL, expires_at timestamptz NOT NULL);
`;
export async function migrateBilling() {
 if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
 const database = createDatabase(process.env.DATABASE_URL);
 try { await database.db.transaction(async tx => { await tx.execute(sql.raw(billingMigration)); }); console.log('Billing schema ready'); }
 finally { await database.close(); }
}
