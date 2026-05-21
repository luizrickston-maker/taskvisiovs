-- Adiciona a coluna de briefing na tabela de tarefas, se ainda não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_tasks' AND column_name = 'video_editing_briefing_id') THEN
        ALTER TABLE public.project_tasks ADD COLUMN video_editing_briefing_id UUID REFERENCES public.video_editing_briefings(id) ON DELETE SET NULL;
    END IF;
END $$;
