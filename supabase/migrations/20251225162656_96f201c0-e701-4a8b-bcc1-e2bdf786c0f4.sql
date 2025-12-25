-- Criar tabela project_tasks
CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own project_tasks" 
ON public.project_tasks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project_tasks" 
ON public.project_tasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project_tasks" 
ON public.project_tasks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own project_tasks" 
ON public.project_tasks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_project_tasks_updated_at
BEFORE UPDATE ON public.project_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime
ALTER TABLE public.project_tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;