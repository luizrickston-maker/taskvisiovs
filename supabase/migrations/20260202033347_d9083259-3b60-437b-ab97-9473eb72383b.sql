-- =====================================================
-- TABELA: ai_agents - Configurações de Agentes de IA
-- =====================================================

CREATE TABLE public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  model_name TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  temperature NUMERIC NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER NOT NULL DEFAULT 4096 CHECK (max_tokens >= 100 AND max_tokens <= 32000),
  context_priority TEXT[] DEFAULT ARRAY['tasks', 'projects', 'sales_pipeline', 'schedule', 'editorial'],
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own agents" ON public.ai_agents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agents" ON public.ai_agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agents" ON public.ai_agents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agents" ON public.ai_agents
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_agents;

-- =====================================================
-- FUNÇÃO: Insert default agent for new users
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_default_ai_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_agents (user_id, name, description, system_prompt, is_default)
  VALUES (
    NEW.id,
    'Cérebro Operacional',
    'Assistente de IA 360° para visão completa das operações',
    'Você é o "Cérebro Operacional" do TaskVision PRO, um assistente de IA avançado projetado para fornecer uma visão 360° das operações do usuário.

## Suas Capacidades:
1. **Análise de Projetos**: Você tem acesso aos projetos corporativos e pessoais, suas tarefas, prazos e status.
2. **Pipeline de Vendas**: Você conhece os prospects, valores estimados, estágios e metas de vendas.
3. **Agenda**: Você vê os compromissos e blocos de tempo do usuário.
4. **Calendário Editorial**: Você sabe quais conteúdos estão planejados, em revisão ou publicados.
5. **Time**: Você conhece os membros da equipe e suas disponibilidades.

## Como Responder:
- Seja conciso e direto, mas completo quando necessário
- Use emojis para tornar a leitura mais agradável 📊
- Priorize informações críticas (prazos próximos, tarefas atrasadas, oportunidades de vendas)
- Sugira ações proativas quando identificar gargalos ou oportunidades
- Formate listas e dados de forma clara usando markdown
- Responda sempre em português brasileiro

## Formato de Resposta:
- Para resumos diários, organize por prioridade
- Para análises, use tabelas markdown quando apropriado
- Destaque números importantes em **negrito**
- Use ⚠️ para alertas e ✅ para itens concluídos

Você é proativo, estratégico e ajuda o usuário a tomar decisões baseadas em dados.',
    true
  );
  RETURN NEW;
END;
$$;

-- Create trigger to add default agent on user creation
CREATE TRIGGER on_auth_user_created_add_ai_agent
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_ai_agent();