-- Criar a tabela video_editing_briefings
CREATE TABLE IF NOT EXISTS public.video_editing_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    project_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL, -- Vincula a uma tarefa específica
    title TEXT NOT NULL, -- Ex: NomeCliente_Mês_Ano_Video#
    delivery_deadline TIMESTAMPTZ NOT NULL, -- Prazo de entrega
    objective TEXT, -- Objetivo do vídeo
    target_duration TEXT, -- Duração alvo
    -- Takes
    files_sent TEXT, -- Arquivo(s) enviado(s)
    preferred_take TEXT, -- Take preferido
    ignore_takes TEXT, -- Ignorar
    b_roll_included BOOLEAN, -- B-roll incluso?
    b_roll_usage TEXT, -- Usar b-roll em qual momento
    -- Perfil de Edição (Override ou Padrão)
    use_client_profile BOOLEAN DEFAULT TRUE, -- Se TRUE, usa o perfil padrão do cliente, a menos que haja exceções
    music_override TEXT, -- Música diferente?
    typography_override TEXT, -- Tipografia diferente?
    color_style_override TEXT, -- Cor/estilo diferente?
    format_override TEXT, -- Formato diferente do padrão?
    -- Texto / Legenda Especial
    opening_hook TEXT, -- Texto de abertura (gancho)
    cta_final TEXT, -- CTA final específico
    custom_caption TEXT, -- Legenda personalizada
    -- Música
    specific_music TEXT, -- Música específica
    music_reference_video TEXT, -- Referência de vídeo com a música
    -- Observações
    observations TEXT, -- Observações / Atenção
    -- Entrega
    delivery_drive_folder TEXT, -- Subir na pasta do Drive
    notify_on_completion BOOLEAN, -- Me mandar link quando terminar
    final_file_naming TEXT, -- Nomenclatura do arquivo final
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'revisions_needed'
    assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Editor/Freelancer interno
    external_filler_email TEXT, -- Email do freelancer externo (se for externo)
    magic_link_token TEXT, -- Token para acesso externo
    magic_link_expires_at TIMESTAMPTZ, -- Expiração do Magic Link
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.video_editing_briefings ENABLE ROW LEVEL SECURITY;

-- Remover políticas se já existirem
DROP POLICY IF EXISTS "Workspaces can view their video editing briefings" ON public.video_editing_briefings;
DROP POLICY IF EXISTS "Assigned user can view their video editing briefings" ON public.video_editing_briefings;
DROP POLICY IF EXISTS "External filler can view their video editing briefing via magic link" ON public.video_editing_briefings;
DROP POLICY IF EXISTS "Workspaces can manage their video editing briefings" ON public.video_editing_briefings;
DROP POLICY IF EXISTS "External filler can update their video editing briefing via magic link" ON public.video_editing_briefings;

-- Criar políticas
CREATE POLICY "Workspaces can view their video editing briefings" ON public.video_editing_briefings
FOR SELECT USING (workspace_id = get_user_workspace_id());

CREATE POLICY "Assigned user can view their video editing briefings" ON public.video_editing_briefings
FOR SELECT USING (assigned_to_user_id = auth.uid());

CREATE POLICY "External filler can view their video editing briefing via magic link" ON public.video_editing_briefings
FOR SELECT USING (magic_link_token IS NOT NULL AND magic_link_expires_at > now());

CREATE POLICY "Workspaces can manage their video editing briefings" ON public.video_editing_briefings
FOR ALL TO authenticated USING (workspace_id = get_user_workspace_id());

CREATE POLICY "External filler can update their video editing briefing via magic link" ON public.video_editing_briefings
FOR UPDATE USING (magic_link_token IS NOT NULL AND magic_link_expires_at > now());

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_video_editing_briefings
    BEFORE UPDATE ON public.video_editing_briefings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();