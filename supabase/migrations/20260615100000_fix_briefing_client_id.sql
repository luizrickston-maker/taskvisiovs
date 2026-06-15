-- Torna client_id opcional em video_editing_briefings
-- (projetos nem sempre têm cliente vinculado ao criar o briefing)
ALTER TABLE public.video_editing_briefings ALTER COLUMN client_id DROP NOT NULL;

-- Adiciona client_id em projects para vincular ao cadastro de clientes
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_id uuid
  REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);