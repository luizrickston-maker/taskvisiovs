-- Adicionar colunas se não existirem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'assigned_to') THEN
        ALTER TABLE public.projects ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_tasks' AND column_name = 'assigned_to') THEN
        ALTER TABLE public.project_tasks ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'corporate_team' AND column_name = 'member_user_id') THEN
        ALTER TABLE public.corporate_team ADD COLUMN member_user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Remover políticas existentes se houver (para evitar conflito ao recriar)
DROP POLICY IF EXISTS "Collaborators can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Collaborators can update status of assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Collaborators can view assigned tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Collaborators can update assigned tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Collaborators can view their own team record" ON public.corporate_team;

-- Recriar Políticas
CREATE POLICY "Collaborators can view assigned projects" ON public.projects
FOR SELECT TO authenticated
USING (auth.uid() = assigned_to OR auth.uid() = user_id);

CREATE POLICY "Collaborators can update status of assigned projects" ON public.projects
FOR UPDATE TO authenticated
USING (auth.uid() = assigned_to OR auth.uid() = user_id);

CREATE POLICY "Collaborators can view assigned tasks" ON public.project_tasks
FOR SELECT TO authenticated
USING (auth.uid() = assigned_to OR auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND (p.assigned_to = auth.uid() OR p.user_id = auth.uid())
));

CREATE POLICY "Collaborators can update assigned tasks" ON public.project_tasks
FOR UPDATE TO authenticated
USING (auth.uid() = assigned_to OR auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND (p.assigned_to = auth.uid() OR p.user_id = auth.uid())
));

CREATE POLICY "Collaborators can view their own team record" ON public.corporate_team
FOR SELECT TO authenticated
USING (auth.uid() = member_user_id OR auth.uid() = user_id);
