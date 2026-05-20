-- Adicionar colunas à tabela de clientes
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS default_editing_profile JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS video_management_enabled BOOLEAN DEFAULT false;

-- Adicionar colunas à tabela de briefings para suportar briefings de edição
ALTER TABLE public.briefings 
ADD COLUMN IF NOT EXISTS briefing_type TEXT DEFAULT 'creative' CHECK (briefing_type IN ('creative', 'editing')),
ADD COLUMN IF NOT EXISTS editing_details JSONB DEFAULT '{}'::jsonb;

-- Comentários para documentação
COMMENT ON COLUMN public.clients.default_editing_profile IS 'Configurações padrão de edição de vídeo para o cliente.';
COMMENT ON COLUMN public.clients.video_management_enabled IS 'Indica se o módulo de gestão de vídeo está ativo para este cliente.';
COMMENT ON COLUMN public.briefings.briefing_type IS 'Tipo do briefing: creative (criativo/geral) ou editing (instruções de edição).';
COMMENT ON COLUMN public.briefings.editing_details IS 'Detalhes específicos para briefings do tipo editing.';