-- SECURITY FIX: Remove api_keys table that stores sensitive data in plain text
-- The table is currently empty so no data will be lost

DROP TABLE IF EXISTS public.api_keys;