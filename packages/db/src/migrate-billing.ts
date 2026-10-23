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
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='companies' AND column_name='preferred_subscription') THEN
  ALTER TABLE companies ADD COLUMN preferred_subscription integer NOT NULL DEFAULT 1 CHECK (preferred_subscription IN (1,2,3));
  UPDATE companies SET preferred_subscription=CASE requested_plan WHEN 'visibility' THEN 2 WHEN 'employer' THEN 3 ELSE 1 END;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='companies' AND column_name='current_subscription') THEN
  ALTER TABLE companies ADD COLUMN current_subscription integer CHECK (current_subscription IN (1,2,3));
  UPDATE companies SET current_subscription=CASE plan WHEN 'visibility' THEN 2 WHEN 'employer' THEN 3 END WHERE plan <> 'free' AND paid_until IS NOT NULL;
 END IF;
END $$;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS brand_name text NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS profile_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS company_profile_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 submitted_by uuid REFERENCES users(id) ON DELETE SET NULL, content jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','superseded')),
 note text NOT NULL DEFAULT '', reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
 reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_profile_revisions_queue_idx ON company_profile_revisions(status,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS company_profile_one_pending_idx ON company_profile_revisions(company_id) WHERE status='pending';
CREATE TABLE IF NOT EXISTS portal_tickets (token_hash text PRIMARY KEY, cookie text NOT NULL, expires_at timestamptz NOT NULL);
`;
export async function migrateBilling() {
 if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
 const database = createDatabase(process.env.DATABASE_URL);
 try { await database.db.transaction(async tx => { await tx.execute(sql.raw(billingMigration)); }); console.log('Billing schema ready'); }
 finally { await database.close(); }
}
