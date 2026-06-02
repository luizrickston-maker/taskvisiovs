-- ============================================================
-- Remove loose magic-link RLS policies (anyone with row knowing nothing could read/write)
-- ============================================================
DROP POLICY IF EXISTS "External access to view briefing" ON public.briefings;
DROP POLICY IF EXISTS "External access to update briefing" ON public.briefings;
DROP POLICY IF EXISTS "External access to briefing responses" ON public.briefing_responses;
DROP POLICY IF EXISTS "External access to briefing video items" ON public.briefing_video_items;
DROP POLICY IF EXISTS "External filler can view their video editing briefing via magic" ON public.video_editing_briefings;
DROP POLICY IF EXISTS "External filler can update their video editing briefing via mag" ON public.video_editing_briefings;

-- ============================================================
-- SECURITY DEFINER RPCs that REQUIRE the actual token value.
-- These are the ONLY way unauthenticated callers can read/write briefings.
-- ============================================================

-- Briefing: fetch full payload by token
CREATE OR REPLACE FUNCTION public.get_briefing_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_briefing public.briefings;
  v_result jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  SELECT * INTO v_briefing
  FROM public.briefings
  WHERE magic_link_token = _token
    AND magic_link_expires_at > now()
  LIMIT 1;

  IF v_briefing.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', v_briefing.id,
    'workspace_id', v_briefing.workspace_id,
    'client_id', v_briefing.client_id,
    'title', v_briefing.title,
    'status', v_briefing.status,
    'briefing_type', v_briefing.briefing_type,
    'editing_details', v_briefing.editing_details,
    'magic_link_expires_at', v_briefing.magic_link_expires_at,
    'created_at', v_briefing.created_at,
    'updated_at', v_briefing.updated_at,
    'review_notes', v_briefing.review_notes,
    'client', (SELECT jsonb_build_object('name', name) FROM public.clients WHERE id = v_briefing.client_id),
    'responses', COALESCE((SELECT jsonb_agg(to_jsonb(r.*)) FROM public.briefing_responses r WHERE r.briefing_id = v_briefing.id), '[]'::jsonb),
    'video_items', COALESCE((SELECT jsonb_agg(to_jsonb(v.*) ORDER BY v.item_index) FROM public.briefing_video_items v WHERE v.briefing_id = v_briefing.id), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Briefing: save responses + video items + optional submit
CREATE OR REPLACE FUNCTION public.save_briefing_by_token(
  _token text,
  _responses jsonb DEFAULT '[]'::jsonb,
  _video_items jsonb DEFAULT NULL,
  _submit boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_briefing_id uuid;
  v_status text;
  r jsonb;
  item jsonb;
  i int := 0;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  SELECT id, status INTO v_briefing_id, v_status
  FROM public.briefings
  WHERE magic_link_token = _token
    AND magic_link_expires_at > now()
  LIMIT 1;

  IF v_briefing_id IS NULL THEN
    RAISE EXCEPTION 'Briefing not found or link expired';
  END IF;

  -- Reject writes once briefing is already in review/approved
  IF v_status IN ('in_review','approved') AND NOT _submit THEN
    RETURN false;
  END IF;

  -- Upsert responses
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(_responses, '[]'::jsonb))
  LOOP
    INSERT INTO public.briefing_responses (briefing_id, block_name, response_data, updated_at)
    VALUES (v_briefing_id, r->>'block_name', r->'response_data', now())
    ON CONFLICT (briefing_id, block_name)
    DO UPDATE SET response_data = EXCLUDED.response_data, updated_at = now();
  END LOOP;

  -- Replace video items if provided (NULL means leave alone)
  IF _video_items IS NOT NULL THEN
    DELETE FROM public.briefing_video_items WHERE briefing_id = v_briefing_id;
    FOR item IN SELECT * FROM jsonb_array_elements(_video_items)
    LOOP
      i := i + 1;
      INSERT INTO public.briefing_video_items (
        briefing_id, item_index, video_theme, key_message, target_audience,
        platform, video_format, duration_estimate, references_links, observations
      ) VALUES (
        v_briefing_id, i,
        item->>'video_theme', item->>'key_message', item->>'target_audience',
        item->>'platform', item->>'video_format', item->>'duration_estimate',
        item->>'references_links', item->>'observations'
      );
    END LOOP;
  END IF;

  IF _submit THEN
    UPDATE public.briefings
    SET status = 'in_review', updated_at = now()
    WHERE id = v_briefing_id;
  END IF;

  RETURN true;
END;
$$;

-- Video editing briefing: fetch by token
CREATE OR REPLACE FUNCTION public.get_video_briefing_by_token(_token text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(v.*)
  FROM public.video_editing_briefings v
  WHERE v.magic_link_token = _token
    AND (v.magic_link_expires_at IS NULL OR v.magic_link_expires_at > now())
    AND _token IS NOT NULL
    AND length(_token) >= 16
  LIMIT 1;
$$;

-- Video editing briefing: update status / observations by token
CREATE OR REPLACE FUNCTION public.update_video_briefing_by_token(
  _token text,
  _status text,
  _observations text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  IF _status NOT IN ('pending','in_progress','review','completed') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT id INTO v_id
  FROM public.video_editing_briefings
  WHERE magic_link_token = _token
    AND (magic_link_expires_at IS NULL OR magic_link_expires_at > now())
  LIMIT 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Briefing not found or link expired';
  END IF;

  UPDATE public.video_editing_briefings
  SET status = _status,
      observations = COALESCE(_observations, observations),
      updated_at = now()
  WHERE id = v_id;

  RETURN true;
END;
$$;

-- Allow anon + authenticated to call these token-validated RPCs
GRANT EXECUTE ON FUNCTION public.get_briefing_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_briefing_by_token(text, jsonb, jsonb, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_video_briefing_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_video_briefing_by_token(text, text, text) TO anon, authenticated;