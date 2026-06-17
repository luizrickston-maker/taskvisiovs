-- Torna o contexto do "Seu Zé" (get_user_360_summary) ESTRITAMENTE PJ:
--   * REMOVE seções pessoais: savings (reservas) e debts (dívidas pessoais).
--   * ADICIONA Caixa PJ (pj_caixa_transacoes) com UUID, para o agente poder
--     LISTAR e APAGAR transações da empresa.
--
-- O agente pessoal usa outra RPC (get_personal_360_summary), que não é afetada.
-- pj_caixa_transacoes é escopada por workspace via RLS (a função roda como o
-- usuário invocador), então não precisa de filtro explícito por workspace.

CREATE OR REPLACE FUNCTION public.get_user_360_summary(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path = public
AS $function$
DECLARE
  result JSON;
BEGIN
  -- Defense-in-depth: validate user_id matches authenticated user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: user_id mismatch';
  END IF;

  SELECT json_build_object(
    'generated_at', NOW(),
    'user_id', p_user_id,

    -- Resumo de Projetos
    'projects', (
      SELECT json_build_object(
        'total', COUNT(*),
        'by_status', json_build_object(
          'todo', COUNT(*) FILTER (WHERE status = 'todo'),
          'progress', COUNT(*) FILTER (WHERE status = 'progress'),
          'blocked', COUNT(*) FILTER (WHERE status = 'blocked'),
          'done', COUNT(*) FILTER (WHERE status = 'done')
        ),
        'corporate_count', COUNT(*) FILTER (WHERE is_corporate = true),
        'overdue_count', COUNT(*) FILTER (WHERE is_overdue = true),
        'items', (
          SELECT COALESCE(json_agg(row_to_json(po.*) ORDER BY po.priority, po.deadline), '[]'::json)
          FROM (SELECT * FROM projects_overview WHERE user_id = p_user_id AND status != 'done' LIMIT 20) po
        )
      )
      FROM projects_overview WHERE user_id = p_user_id
    ),

    -- Resumo de Tarefas (corporativas/PJ)
    'tasks', (
      SELECT json_build_object(
        'total_pending', COUNT(*),
        'by_status', json_build_object(
          'todo', COUNT(*) FILTER (WHERE status = 'todo'),
          'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress')
        ),
        'overdue_count', COUNT(*) FILTER (WHERE is_overdue = true),
        'due_today', COUNT(*) FILTER (WHERE deadline_status = 'today'),
        'due_this_week', COUNT(*) FILTER (WHERE deadline_status = 'this_week'),
        'high_priority', COUNT(*) FILTER (WHERE priority <= 2),
        'items', (
          SELECT COALESCE(json_agg(row_to_json(cpt.*) ORDER BY cpt.priority, cpt.deadline), '[]'::json)
          FROM (SELECT * FROM corporate_pending_tasks WHERE user_id = p_user_id LIMIT 30) cpt
        )
      )
      FROM corporate_pending_tasks WHERE user_id = p_user_id
    ),

    -- Resumo do Pipeline de Vendas
    'sales_pipeline', (
      SELECT json_build_object(
        'total_prospects', COUNT(*),
        'total_value', COALESCE(SUM(estimated_value) FILTER (WHERE status NOT IN ('fechado', 'perdido')), 0),
        'weighted_value', COALESCE(SUM(weighted_value), 0),
        'by_status', json_build_object(
          'novo', COUNT(*) FILTER (WHERE status = 'novo'),
          'em_negociacao', COUNT(*) FILTER (WHERE status = 'em_negociacao'),
          'proposta_enviada', COUNT(*) FILTER (WHERE status = 'proposta_enviada'),
          'fechado', COUNT(*) FILTER (WHERE status = 'fechado'),
          'perdido', COUNT(*) FILTER (WHERE status = 'perdido')
        ),
        'closed_value', COALESCE(SUM(estimated_value) FILTER (WHERE status = 'fechado'), 0),
        'items', (
          SELECT COALESCE(json_agg(row_to_json(sps.*) ORDER BY sps.stage_order, sps.estimated_value DESC), '[]'::json)
          FROM (SELECT * FROM sales_pipeline_summary WHERE user_id = p_user_id AND status NOT IN ('fechado', 'perdido') LIMIT 20) sps
        )
      )
      FROM sales_pipeline_summary WHERE user_id = p_user_id
    ),

    -- Metas de Vendas
    'sales_goals', (
      SELECT COALESCE(json_agg(row_to_json(sgp.*) ORDER BY sgp.end_date), '[]'::json)
      FROM (SELECT * FROM sales_goals_progress WHERE user_id = p_user_id LIMIT 10) sgp
    ),

    -- Agenda
    'schedule', (
      SELECT json_build_object(
        'total_upcoming', COUNT(*),
        'today', COUNT(*) FILTER (WHERE day_status = 'today'),
        'tomorrow', COUNT(*) FILTER (WHERE day_status = 'tomorrow'),
        'this_week', COUNT(*) FILTER (WHERE day_status = 'this_week'),
        'items', (
          SELECT COALESCE(json_agg(row_to_json(ua.*) ORDER BY ua.start_datetime), '[]'::json)
          FROM (SELECT * FROM upcoming_appointments WHERE user_id = p_user_id LIMIT 20) ua
        )
      )
      FROM upcoming_appointments WHERE user_id = p_user_id
    ),

    -- Calendário Editorial
    'editorial', (
      SELECT json_build_object(
        'total_pending', COUNT(*),
        'overdue_count', COUNT(*) FILTER (WHERE is_overdue = true),
        'due_today', COUNT(*) FILTER (WHERE deadline_status = 'today'),
        'by_status', json_build_object(
          'idea', COUNT(*) FILTER (WHERE status = 'idea'),
          'draft', COUNT(*) FILTER (WHERE status = 'draft'),
          'review', COUNT(*) FILTER (WHERE status = 'review'),
          'approved', COUNT(*) FILTER (WHERE status = 'approved')
        ),
        'by_platform', json_build_object(
          'instagram', COUNT(*) FILTER (WHERE platform = 'instagram'),
          'tiktok', COUNT(*) FILTER (WHERE platform = 'tiktok'),
          'youtube', COUNT(*) FILTER (WHERE platform = 'youtube'),
          'linkedin', COUNT(*) FILTER (WHERE platform = 'linkedin'),
          'blog', COUNT(*) FILTER (WHERE platform = 'blog')
        ),
        'items', (
          SELECT COALESCE(json_agg(row_to_json(ecs.*) ORDER BY ecs.publish_date), '[]'::json)
          FROM (SELECT * FROM editorial_calendar_summary WHERE user_id = p_user_id AND status != 'published' LIMIT 20) ecs
        )
      )
      FROM editorial_calendar_summary WHERE user_id = p_user_id
    ),

    -- Equipe
    'team', (
      SELECT json_build_object(
        'active_members', COUNT(*),
        'total_hours_available', COALESCE(SUM(hours_available), 0),
        'members', (
          SELECT COALESCE(json_agg(json_build_object(
            'name', name,
            'role', role,
            'hours_available', hours_available
          )), '[]'::json)
          FROM corporate_team WHERE user_id = p_user_id AND is_active = true
        )
      )
      FROM corporate_team WHERE user_id = p_user_id AND is_active = true
    ),

    -- Financeiro PJ: Investimentos/Custos Corporativos
    'investments', (
      SELECT json_build_object(
        'total_amount', COALESCE(SUM(amount), 0),
        'count', COUNT(*),
        'items', (
          SELECT COALESCE(json_agg(row_to_json(cc.*) ORDER BY cc.purchase_date DESC), '[]'::json)
          FROM (SELECT * FROM corporate_investments WHERE user_id = p_user_id LIMIT 20) cc
        )
      )
      FROM corporate_investments WHERE user_id = p_user_id
    ),

    -- Financeiro PJ: Caixa da empresa (entradas/saídas). Escopo por workspace via RLS.
    'caixa_pj', (
      SELECT json_build_object(
        'total_entradas', COALESCE(SUM(valor) FILTER (WHERE tipo = 'entrada'), 0),
        'total_saidas', COALESCE(SUM(valor) FILTER (WHERE tipo = 'saida'), 0),
        'count', COUNT(*),
        'items', (
          SELECT COALESCE(json_agg(row_to_json(t.*) ORDER BY t.data DESC, t.created_at DESC), '[]'::json)
          FROM (
            SELECT id, tipo, descricao, valor, data, forma_pagamento, origem_destino, created_at
            FROM pj_caixa_transacoes
            ORDER BY data DESC, created_at DESC
            LIMIT 25
          ) t
        )
      )
      FROM pj_caixa_transacoes
    )
  ) INTO result;

  RETURN result;
END;
$function$;
