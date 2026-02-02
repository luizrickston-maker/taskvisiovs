-- Add defensive auth.uid() checks to RPC functions for defense-in-depth

-- 1. Update get_user_360_summary with user validation
CREATE OR REPLACE FUNCTION public.get_user_360_summary(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    
    -- Resumo de Tarefas
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
          SELECT COALESCE(json_agg(row_to_json(pec.*) ORDER BY pec.due_date), '[]'::json)
          FROM (SELECT * FROM pending_editorial_content WHERE user_id = p_user_id LIMIT 20) pec
        )
      )
      FROM pending_editorial_content WHERE user_id = p_user_id
    ),
    
    -- Equipe
    'team', (
      SELECT json_build_object(
        'active_members', COUNT(*),
        'total_hours_available', COALESCE(SUM(hours_available), 0),
        'members', COALESCE(json_agg(json_build_object(
          'id', id,
          'name', name,
          'role', role,
          'hours_available', hours_available
        )), '[]'::json)
      )
      FROM corporate_team WHERE user_id = p_user_id AND is_active = true
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;

-- 2. Update get_personal_360_summary with user validation
CREATE OR REPLACE FUNCTION public.get_personal_360_summary(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    
    -- Resumo Financeiro
    'finances', (
      SELECT json_build_object(
        'income_this_month', COALESCE(total_income_this_month, 0),
        'expenses_this_month', COALESCE(total_expenses_this_month, 0),
        'balance_this_month', COALESCE(total_income_this_month, 0) - COALESCE(total_expenses_this_month, 0),
        'pending_debts', COALESCE(total_pending_debts, 0),
        'overdue_debts_count', COALESCE(overdue_debts_count, 0),
        'total_savings', COALESCE(total_savings, 0)
      )
      FROM personal_financial_summary WHERE user_id = p_user_id
      LIMIT 1
    ),
    
    -- Contas a Vencer
    'debts', (
      SELECT json_build_object(
        'total_pending', COUNT(*),
        'total_amount', COALESCE(SUM(amount), 0),
        'overdue_count', COUNT(*) FILTER (WHERE urgency_status = 'overdue'),
        'critical_count', COUNT(*) FILTER (WHERE urgency_status IN ('today', 'critical')),
        'items', COALESCE(json_agg(row_to_json(ud.*) ORDER BY ud.due_date) FILTER (WHERE ud.id IS NOT NULL), '[]'::json)
      )
      FROM (SELECT * FROM upcoming_debts WHERE user_id = p_user_id LIMIT 15) ud
    ),
    
    -- Tarefas Pessoais
    'tasks', (
      SELECT json_build_object(
        'total_pending', COUNT(*),
        'inbox_count', COUNT(*) FILTER (WHERE type = 'inbox'),
        'today_count', COUNT(*) FILTER (WHERE deadline_status = 'today'),
        'overdue_count', COUNT(*) FILTER (WHERE is_overdue = true),
        'by_status', json_build_object(
          'inbox', COUNT(*) FILTER (WHERE deadline_status = 'inbox'),
          'overdue', COUNT(*) FILTER (WHERE deadline_status = 'overdue'),
          'today', COUNT(*) FILTER (WHERE deadline_status = 'today'),
          'tomorrow', COUNT(*) FILTER (WHERE deadline_status = 'tomorrow'),
          'this_week', COUNT(*) FILTER (WHERE deadline_status = 'this_week')
        ),
        'items', (
          SELECT COALESCE(json_agg(row_to_json(ppt.*) ORDER BY ppt.scheduled_date NULLS LAST), '[]'::json)
          FROM (SELECT * FROM personal_pending_tasks WHERE user_id = p_user_id LIMIT 20) ppt
        )
      )
      FROM personal_pending_tasks WHERE user_id = p_user_id
    ),
    
    -- Agenda (Blocos de Tempo)
    'schedule', (
      SELECT json_build_object(
        'total_upcoming', COUNT(*),
        'today', COUNT(*) FILTER (WHERE day_status = 'today'),
        'tomorrow', COUNT(*) FILTER (WHERE day_status = 'tomorrow'),
        'this_week', COUNT(*) FILTER (WHERE day_status = 'this_week'),
        'items', COALESCE(json_agg(row_to_json(putb.*) ORDER BY putb.start_datetime) FILTER (WHERE putb.id IS NOT NULL), '[]'::json)
      )
      FROM (SELECT * FROM personal_upcoming_time_blocks WHERE user_id = p_user_id LIMIT 20) putb
    ),
    
    -- Metas
    'goals', (
      SELECT json_build_object(
        'total_active', COUNT(*),
        'overdue_count', COUNT(*) FILTER (WHERE is_overdue = true),
        'urgent_count', COUNT(*) FILTER (WHERE status = 'urgent'),
        'items', COALESCE(json_agg(row_to_json(pag.*) ORDER BY pag.deadline) FILTER (WHERE pag.id IS NOT NULL), '[]'::json)
      )
      FROM (SELECT * FROM personal_active_goals WHERE user_id = p_user_id LIMIT 10) pag
    ),
    
    -- Projetos Pessoais
    'projects', (
      SELECT json_build_object(
        'total', COUNT(*),
        'by_status', json_build_object(
          'todo', COUNT(*) FILTER (WHERE status = 'todo'),
          'progress', COUNT(*) FILTER (WHERE status = 'progress'),
          'blocked', COUNT(*) FILTER (WHERE status = 'blocked'),
          'done', COUNT(*) FILTER (WHERE status = 'done')
        ),
        'items', (
          SELECT COALESCE(json_agg(row_to_json(ppo.*) ORDER BY ppo.priority, ppo.updated_at DESC), '[]'::json)
          FROM (SELECT * FROM personal_projects_overview WHERE user_id = p_user_id AND status != 'done' LIMIT 15) ppo
        )
      )
      FROM personal_projects_overview WHERE user_id = p_user_id
    ),
    
    -- Roteiros
    'scripts', (
      SELECT json_build_object(
        'total_pending', COUNT(*),
        'overdue_count', COUNT(*) FILTER (WHERE is_overdue = true),
        'today_count', COUNT(*) FILTER (WHERE deadline_status = 'today'),
        'by_status', json_build_object(
          'draft', COUNT(*) FILTER (WHERE status = 'draft'),
          'scheduled', COUNT(*) FILTER (WHERE status = 'scheduled')
        ),
        'by_platform', json_build_object(
          'youtube', COUNT(*) FILTER (WHERE platform = 'youtube'),
          'youtube_shorts', COUNT(*) FILTER (WHERE platform = 'youtube_shorts'),
          'tiktok', COUNT(*) FILTER (WHERE platform = 'tiktok'),
          'instagram_reels', COUNT(*) FILTER (WHERE platform = 'instagram_reels'),
          'instagram_post', COUNT(*) FILTER (WHERE platform = 'instagram_post')
        ),
        'items', COALESCE(json_agg(row_to_json(ps.*) ORDER BY ps.scheduled_date) FILTER (WHERE ps.id IS NOT NULL), '[]'::json)
      )
      FROM (SELECT * FROM pending_scripts WHERE user_id = p_user_id LIMIT 15) ps
    ),
    
    -- Planos de Compra
    'purchase_plans', (
      SELECT json_build_object(
        'total_active', COUNT(*),
        'total_target', COALESCE(SUM(target_amount), 0),
        'total_saved', COALESCE(SUM(saved_amount), 0),
        'total_remaining', COALESCE(SUM(remaining_amount), 0),
        'by_priority', json_build_object(
          'high', COUNT(*) FILTER (WHERE priority = 'high'),
          'medium', COUNT(*) FILTER (WHERE priority = 'medium'),
          'low', COUNT(*) FILTER (WHERE priority = 'low')
        ),
        'items', COALESCE(json_agg(row_to_json(app.*) ORDER BY app.priority DESC, app.deadline NULLS LAST) FILTER (WHERE app.id IS NOT NULL), '[]'::json)
      )
      FROM (SELECT * FROM active_purchase_plans WHERE user_id = p_user_id LIMIT 10) app
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;