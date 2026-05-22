-- 1. Estabilizar Business Processes (Canvas Visual)
DROP POLICY IF EXISTS "bp_select" ON public.business_processes;
DROP POLICY IF EXISTS "bp_insert" ON public.business_processes;
DROP POLICY IF EXISTS "bp_update" ON public.business_processes;
DROP POLICY IF EXISTS "bp_delete" ON public.business_processes;

CREATE POLICY "Users can view workspace processes" 
ON public.business_processes FOR SELECT 
USING (has_workspace_access(workspace_id));

CREATE POLICY "Users can manage workspace processes" 
ON public.business_processes FOR ALL 
USING (has_workspace_access(workspace_id))
WITH CHECK (has_workspace_access(workspace_id));

-- 2. Estabilizar Process Steps e Connections
DROP POLICY IF EXISTS "ps_select" ON public.process_steps;
DROP POLICY IF EXISTS "ps_insert" ON public.process_steps;
DROP POLICY IF EXISTS "ps_update" ON public.process_steps;
DROP POLICY IF EXISTS "ps_delete" ON public.process_steps;

CREATE POLICY "Users can view workspace process steps" 
ON public.process_steps FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.business_processes bp 
  WHERE bp.id = process_id AND has_workspace_access(bp.workspace_id)
));

CREATE POLICY "Users can manage workspace process steps" 
ON public.process_steps FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.business_processes bp 
  WHERE bp.id = process_id AND has_workspace_access(bp.workspace_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.business_processes bp 
  WHERE bp.id = process_id AND has_workspace_access(bp.workspace_id)
));

DROP POLICY IF EXISTS "pc_select" ON public.process_connections;
DROP POLICY IF EXISTS "pc_insert" ON public.process_connections;
DROP POLICY IF EXISTS "pc_update" ON public.process_connections;
DROP POLICY IF EXISTS "pc_delete" ON public.process_connections;

CREATE POLICY "Users can view workspace process connections" 
ON public.process_connections FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.business_processes bp 
  WHERE bp.id = process_id AND has_workspace_access(bp.workspace_id)
));

CREATE POLICY "Users can manage workspace process connections" 
ON public.process_connections FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.business_processes bp 
  WHERE bp.id = process_id AND has_workspace_access(bp.workspace_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.business_processes bp 
  WHERE bp.id = process_id AND has_workspace_access(bp.workspace_id)
));

-- 3. Estabilizar Briefing Responses e Video Items
DROP POLICY IF EXISTS "Workspace members can manage briefing responses" ON public.briefing_responses;
DROP POLICY IF EXISTS "Workspace members can manage briefing video items" ON public.briefing_video_items;

CREATE POLICY "Users can view workspace briefing responses" 
ON public.briefing_responses FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.briefings b 
  WHERE b.id = briefing_id AND has_workspace_access(b.workspace_id)
));

CREATE POLICY "Users can manage workspace briefing responses" 
ON public.briefing_responses FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.briefings b 
  WHERE b.id = briefing_id AND has_workspace_access(b.workspace_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.briefings b 
  WHERE b.id = briefing_id AND has_workspace_access(b.workspace_id)
));

CREATE POLICY "Users can view workspace briefing video items" 
ON public.briefing_video_items FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.briefings b 
  WHERE b.id = briefing_id AND has_workspace_access(b.workspace_id)
));

CREATE POLICY "Users can manage workspace briefing video items" 
ON public.briefing_video_items FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.briefings b 
  WHERE b.id = briefing_id AND has_workspace_access(b.workspace_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.briefings b 
  WHERE b.id = briefing_id AND has_workspace_access(b.workspace_id)
));

-- 4. Garantir que Editorial Calendar Items sejam visíveis para membros do workspace
DROP POLICY IF EXISTS "Users can view own editorial items" ON public.editorial_calendar_items;
DROP POLICY IF EXISTS "Users can insert own editorial items" ON public.editorial_calendar_items;
DROP POLICY IF EXISTS "Users can update own editorial items" ON public.editorial_calendar_items;
DROP POLICY IF EXISTS "Users can delete own editorial items" ON public.editorial_calendar_items;

CREATE POLICY "Users can view workspace editorial items" 
ON public.editorial_calendar_items FOR SELECT 
USING (has_workspace_access(workspace_id) OR (is_client_user(workspace_id, auth.uid()) AND client_id = get_my_client_id(workspace_id)));

CREATE POLICY "Users can manage workspace editorial items" 
ON public.editorial_calendar_items FOR ALL 
USING (has_workspace_access(workspace_id))
WITH CHECK (has_workspace_access(workspace_id));
