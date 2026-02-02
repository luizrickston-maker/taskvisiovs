-- Adicionar tabelas que ainda NÃO estão na publication (evitando duplicatas)
DO $$
DECLARE
  tbl_name TEXT;
  tables_to_add TEXT[] := ARRAY['ai_api_keys', 'time_block_types', 'project_categories', 'user_preferences', 'user_roles'];
BEGIN
  FOREACH tbl_name IN ARRAY tables_to_add LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = tbl_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl_name);
      RAISE NOTICE 'Added table % to realtime', tbl_name;
    ELSE
      RAISE NOTICE 'Table % already in realtime, skipping', tbl_name;
    END IF;
  END LOOP;
END $$;

-- 2. Criar função para criar agente padrão automaticamente para novos usuários
CREATE OR REPLACE FUNCTION public.create_default_ai_agent_for_user()
RETURNS TRIGGER AS $$
DECLARE
  agent_exists BOOLEAN;
BEGIN
  -- Verificar se já existe um agente padrão para o usuário
  SELECT EXISTS (
    SELECT 1 FROM public.ai_agents 
    WHERE user_id = NEW.user_id AND is_default = true
  ) INTO agent_exists;
  
  -- Se não existe, criar um agente padrão
  IF NOT agent_exists THEN
    INSERT INTO public.ai_agents (
      user_id,
      name,
      description,
      system_prompt,
      model_name,
      temperature,
      max_tokens,
      is_default,
      is_active,
      context_priority
    ) VALUES (
      NEW.user_id,
      'Assistente Principal',
      'Agente de IA padrão para análise operacional e suporte a decisões',
      'Você é o "Cérebro Operacional" do TaskVision PRO, um assistente de IA avançado projetado para fornecer uma visão 360° das operações do usuário.

## Como Responder:
- Seja conciso e direto, mas completo quando necessário
- Use emojis para tornar a leitura mais agradável 📊
- Priorize informações críticas (prazos próximos, tarefas atrasadas, oportunidades de vendas)
- Sugira ações proativas quando identificar gargalos ou oportunidades
- Formate listas e dados de forma clara usando markdown
- Responda sempre em português brasileiro

Você é proativo, estratégico e ajuda o usuário a tomar decisões baseadas em dados.',
      'google/gemini-3-flash-preview',
      0.7,
      4096,
      true,
      true,
      ARRAY['tasks', 'projects', 'sales_pipeline', 'schedule', 'editorial', 'team']
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Criar trigger que dispara após criar user_preferences
DROP TRIGGER IF EXISTS create_default_agent_on_preferences ON public.user_preferences;
CREATE TRIGGER create_default_agent_on_preferences
  AFTER INSERT ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_ai_agent_for_user();