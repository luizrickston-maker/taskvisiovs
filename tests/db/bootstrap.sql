-- Supabase compatibility layer for the natively installed PostgreSQL 17.
--
-- Creates only the plumbing Supabase ships that a vanilla install lacks: the
-- auth schema, the three API roles, pgcrypto, the realtime publication, and
-- no-op stubs for pg_net and pg_cron. RLS policies, CHECK constraints,
-- triggers and every other statement in supabase/migrations/ run unmodified -
-- that is what the database tests exercise. Anything that depends on
-- Supabase's real auth server is out of scope for this harness.
--
-- `private` is intentionally absent: the migrations create it themselves.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Roles the migrations grant to
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;

-- Supabase grants every table, sequence and function created in public to the
-- API roles by default; a vanilla install does nothing of the sort, so a policy
-- could pass while the GRANT fails ("permission denied for table ..."). Runs
-- before every migration, so it covers all of them.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. pgcrypto: Supabase ships it pre-installed; gen_random_uuid() is core in
--    PG 13+, but 20260518141720 uses gen_random_bytes() as a column DEFAULT,
--    which only pgcrypto provides.
-- ────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. auth schema: users table, auth.uid(), auth.role()
-- ────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  instance_id uuid,
  aud varchar(255),
  role varchar(255),
  email varchar(255),
  encrypted_password varchar(255),
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Supabase's own expression: the caller's identity is the `sub` claim of the
-- request.jwt.claims setting, so `SET request.jwt.claims` impersonates a user
-- exactly the way a verified JWT would.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'sub')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'role'
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.role() TO PUBLIC;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. storage schema: buckets, objects, foldername()
-- ────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Storage policies compare (storage.foldername(name))[1] against auth.uid().
CREATE OR REPLACE FUNCTION storage.foldername(filename text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (string_to_array(filename, '/'))[1 : array_length(string_to_array(filename, '/'), 1) - 1]
$$;

GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.buckets, storage.objects TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION storage.foldername(text) TO PUBLIC;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. net schema: pg_net's http_post as a no-op
-- ────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS net;

CREATE OR REPLACE FUNCTION net.http_post(
  url text,
  headers jsonb DEFAULT '{}'::jsonb,
  body jsonb DEFAULT '{}'::jsonb,
  mime_type text DEFAULT NULL,
  secret text DEFAULT NULL,
  timeout_milliseconds integer DEFAULT 5000
)
RETURNS bigint
LANGUAGE sql
AS $$
  SELECT 0::bigint
$$;

GRANT USAGE ON SCHEMA net TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION net.http_post(text, jsonb, jsonb, text, text, integer) TO PUBLIC;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. cron schema: pg_cron's schedule/unschedule and its job catalog
-- ────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS cron;

CREATE TABLE IF NOT EXISTS cron.job (
  jobid serial PRIMARY KEY,
  jobname text NOT NULL,
  schedule text,
  command text
);

CREATE OR REPLACE FUNCTION cron.schedule(job_name text, schedule text, command text)
RETURNS bigint
LANGUAGE sql
AS $$
  INSERT INTO cron.job (jobname, schedule, command)
  VALUES (job_name, schedule, command)
  RETURNING jobid
$$;

CREATE OR REPLACE FUNCTION cron.unschedule(job_name text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM cron.job WHERE jobname = job_name;
  RETURN FOUND;
END;
$$;

GRANT USAGE ON SCHEMA cron TO anon, authenticated, service_role;
GRANT SELECT ON cron.job TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION cron.schedule(text, text, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cron.unschedule(text) TO PUBLIC;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Realtime publication every migration registers its tables with
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;
