ALTER TABLE jobs ADD COLUMN IF NOT EXISTS content jsonb;
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS review_state text;
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS jobs_company_idx ON jobs(company_id);
