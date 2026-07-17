-- =====================================================
-- RPC: ensure_planner_agent()
-- Cria (ou retorna o existente) o agente "Planejamento de
-- Projeto (IA)" para o usuário autenticado. Idempotente.
-- =====================================================

CREATE OR REPLACE FUNCTION public.ensure_planner_agent()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
  v_agent_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT get_my_workspace_id() INTO v_workspace_id;

  SELECT id INTO v_agent_id
  FROM ai_agents
  WHERE user_id = v_user_id
    AND name = 'Planejamento de Projeto (IA)'
  LIMIT 1;

  IF v_agent_id IS NOT NULL THEN
    RETURN v_agent_id;
  END IF;

  INSERT INTO ai_agents (
    user_id,
    workspace_id,
    name,
    description,
    system_prompt,
    model_name,
    temperature,
    max_tokens,
    context_priority,
    is_default,
    is_active,
    routing_enabled
  ) VALUES (
    v_user_id,
    v_workspace_id,
    'Planejamento de Projeto (IA)',
    'Gera plano de execução (projeto + etapas + tarefas + cronograma) a partir de contrato ou briefing do cliente. Importa direto no módulo Projetos.',
    'Você é a skill "Planejamento de Projeto" do TaskVision PRO. Recebe contrato/briefing e devolve um plano estruturado em Markdown + bloco JSON v1.0 (json-project-plan) com projeto, etapas (Briefing/Roteiro/Captação/Edição/Entrega) e tarefas datadas. Calendário interno: Seg-Qui 10h, Sex 3h, sem Sáb/Dom. Total 43h/sem por colaborador. O prompt operacional completo está embarcado na edge function ai-project-planner.',
    'openai/gpt-4o',
    0.2,
    4096,
    ARRAY['processes', 'team'],
    false,
    true,
    false
  )
  RETURNING id INTO v_agent_id;

  RETURN v_agent_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_planner_agent() TO authenticated;