CREATE TABLE IF NOT EXISTS site_settings (
 id text PRIMARY KEY, content jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
 updated_by uuid REFERENCES users(id) ON DELETE SET NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS site_media (
 id uuid PRIMARY KEY, key text NOT NULL,
 created_by uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
