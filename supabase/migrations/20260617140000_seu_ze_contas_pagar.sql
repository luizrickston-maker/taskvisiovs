-- Adiciona "contas_pagar" (pj_contas_pagar) ao contexto do Seu Zé, para que a
-- IA possa LISTAR, PAGAR e APAGAR contas a pagar (precisa enxergar os UUIDs).
-- Mantém tudo que a versão PJ-only já tinha (sem savings/debts, com caixa_pj).
-- Escopo por workspace via RLS (função roda como o usuário invocador).

CREATE OR REPLACE FUNCTION public.get_user_360_summary(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path = public
AS $function$
DECLARE
  result JSON;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: user_id mismatch';
  END IF;

  SELECT json_build_object(
    'generated_at', NOW(),
    'user_id', p_user_id,

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

    'sales_goals', (
      SELECT COALESCE(json_agg(row_to_json(sgp.*) ORDER BY sgp.end_date), '[]'::json)
      FROM (SELECT * FROM sales_goals_progress WHERE user_id = p_user_id LIMIT 10) sgp
    ),

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
    ),

    -- Contas a pagar (pendentes/vencidas) — para listar, pagar e apagar via IA
    'contas_pagar', (
      SELECT json_build_object(
        'total_pendente', COALESCE(SUM(valor) FILTER (WHERE status IN ('pendente', 'vencido')), 0),
        'count_pendente', COUNT(*) FILTER (WHERE status IN ('pendente', 'vencido')),
        'items', (
          SELECT COALESCE(json_agg(row_to_json(c.*) ORDER BY c.data_vencimento), '[]'::json)
          FROM (
            SELECT id, descricao, fornecedor, valor, data_vencimento, data_pagamento, status, recorrente, frequencia
            FROM pj_contas_pagar
            WHERE status IN ('pendente', 'vencido')
            ORDER BY data_vencimento
            LIMIT 25
          ) c
        )
      )
      FROM pj_contas_pagar
    )
  ) INTO result;

  RETURN result;
END;
$function$;
