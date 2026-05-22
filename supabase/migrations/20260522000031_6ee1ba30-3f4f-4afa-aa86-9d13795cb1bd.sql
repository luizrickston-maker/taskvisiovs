-- 1. Update projects policies
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "Users can view workspace projects" 
ON public.projects FOR SELECT 
USING (has_workspace_access(workspace_id));

CREATE POLICY "Users can manage workspace projects" 
ON public.projects FOR ALL 
USING (has_workspace_access(workspace_id))
WITH CHECK (has_workspace_access(workspace_id));

-- 2. Update project_tasks policies
DROP POLICY IF EXISTS "Users can view own project tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Users can manage own project tasks" ON public.project_tasks;

-- If they didn't exist or had different names, we just create the new ones.
-- Let's check existing policies for project_tasks to be sure.
-- Actually, let's just create them as the definitive ones.

CREATE POLICY "Users can view workspace project tasks" 
ON public.project_tasks FOR SELECT 
USING (has_workspace_access(workspace_id));

CREATE POLICY "Users can manage workspace project tasks" 
ON public.project_tasks FOR ALL 
USING (has_workspace_access(workspace_id))
WITH CHECK (has_workspace_access(workspace_id));
