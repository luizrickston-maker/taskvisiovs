
-- Table for short link mappings
CREATE TABLE public.portal_short_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  target_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

-- Enable RLS
ALTER TABLE public.portal_short_links ENABLE ROW LEVEL SECURITY;

-- Public SELECT for anon (redirect page needs to read without auth)
CREATE POLICY "Anyone can read short links"
  ON public.portal_short_links
  FOR SELECT
  USING (true);

-- Index on code for fast lookups
CREATE INDEX idx_portal_short_links_code ON public.portal_short_links (code);
