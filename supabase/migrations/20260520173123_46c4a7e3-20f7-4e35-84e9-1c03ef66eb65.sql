-- Criar a tabela client_video_settings
CREATE TABLE IF NOT EXISTS public.client_video_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    -- Configurações Padrão
    default_music_style TEXT, -- Ex: 'Seguir padrão do perfil', 'Música específica: <nome>', 'Referência de vídeo: <link>'
    default_typography TEXT, -- Ex: 'Seguir padrão do perfil', 'Tipografia diferente: <nome>'
    default_color_style TEXT, -- Ex: 'Seguir padrão do perfil', 'Cor/estilo diferente: <descrição>'
    default_format TEXT, -- Ex: 'Reel', 'Talk', 'Outro'
    default_cta TEXT, -- CTA final padrão
    default_drive_folder_link TEXT, -- Pasta raiz do Drive para entregas
    default_file_naming TEXT, -- Nomenclatura do arquivo final padrão
    -- Flag para ativar/desativar gestão de vídeo para o cliente
    video_management_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_id) -- Garante apenas um perfil por cliente
);

-- Habilitar RLS
ALTER TABLE public.client_video_settings ENABLE ROW LEVEL SECURITY;

-- Remover políticas se já existirem (para evitar erros em re-execuções)
DROP POLICY IF EXISTS "Workspaces can view their client video settings" ON public.client_video_settings;
DROP POLICY IF EXISTS "Workspaces can manage their client video settings" ON public.client_video_settings;

-- Criar as políticas de RLS utilizando a função get_user_workspace_id()
CREATE POLICY "Workspaces can view their client video settings" ON public.client_video_settings
FOR SELECT USING (workspace_id = get_user_workspace_id());

CREATE POLICY "Workspaces can manage their client video settings" ON public.client_video_settings
FOR ALL TO authenticated USING (workspace_id = get_user_workspace_id());

-- Criar trigger para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_video_settings
    BEFORE UPDATE ON public.client_video_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();