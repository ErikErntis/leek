ALTER TABLE jobs ADD COLUMN IF NOT EXISTS published_content jsonb;
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS published_at timestamptz;
--> statement-breakpoint
UPDATE jobs SET published_content = content, published_at = updated_at
WHERE status = 'published' AND review_state = 'approved' AND published_content IS NULL;
--> statement-breakpoint
DO $$ BEGIN
 IF to_regclass('inquiries') IS NOT NULL THEN
  ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_kind_check;
  ALTER TABLE inquiries ADD CONSTRAINT inquiries_kind_check CHECK(kind IN ('product','fixed_service','service_quote','work_application'));
 END IF;
END $$;
