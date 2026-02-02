-- =====================================================
-- Views para Agregação de Dados Pessoais - TaskVision PRO
-- =====================================================

-- 1. View: Resumo Financeiro Pessoal
CREATE OR REPLACE VIEW public.personal_financial_summary AS
SELECT 
    i.user_id,
    COALESCE(SUM(i.amount), 0) AS total_income_this_month,
    (SELECT COALESCE(SUM(e.amount), 0) 
     FROM public.expenses e 
     WHERE e.user_id = i.user_id 
     AND date_trunc('month', e.date::date) = date_trunc('month', CURRENT_DATE)) AS total_expenses_this_month,
    (SELECT COALESCE(SUM(d.amount), 0) 
     FROM public.debts d 
     WHERE d.user_id = i.user_id 
     AND d.paid = FALSE) AS total_pending_debts,
    (SELECT COUNT(*) 
     FROM public.debts d 
     WHERE d.user_id = i.user_id 
     AND d.paid = FALSE 
     AND d.due_date::date <= CURRENT_DATE) AS overdue_debts_count,
    (SELECT COALESCE(SUM(s.amount), 0) 
     FROM public.savings s 
     WHERE s.user_id = i.user_id) AS total_savings
FROM public.incomes i
WHERE date_trunc('month', i.date::date) = date_trunc('month', CURRENT_DATE)
GROUP BY i.user_id

UNION ALL

-- Include users with no income this month but have other financial data
SELECT DISTINCT
    u.user_id,
    0 AS total_income_this_month,
    COALESCE((SELECT SUM(e.amount) FROM public.expenses e 
              WHERE e.user_id = u.user_id 
              AND date_trunc('month', e.date::date) = date_trunc('month', CURRENT_DATE)), 0),
    COALESCE((SELECT SUM(d.amount) FROM public.debts d 
              WHERE d.user_id = u.user_id AND d.paid = FALSE), 0),
    (SELECT COUNT(*) FROM public.debts d 
     WHERE d.user_id = u.user_id AND d.paid = FALSE 
     AND d.due_date::date <= CURRENT_DATE),
    COALESCE((SELECT SUM(s.amount) FROM public.savings s WHERE s.user_id = u.user_id), 0)
FROM (
    SELECT user_id FROM public.expenses
    UNION SELECT user_id FROM public.debts
    UNION SELECT user_id FROM public.savings
) u
WHERE u.user_id NOT IN (
    SELECT DISTINCT user_id FROM public.incomes 
    WHERE date_trunc('month', date::date) = date_trunc('month', CURRENT_DATE)
);

-- 2. View: Tarefas Pessoais Pendentes
CREATE OR REPLACE VIEW public.personal_pending_tasks AS
SELECT
    t.id,
    t.user_id,
    t.title,
    t.type,
    t.scheduled_date,
    t.created_at,
    CASE
        WHEN t.scheduled_date IS NULL THEN 'inbox'
        WHEN t.scheduled_date::date < CURRENT_DATE THEN 'overdue'
        WHEN t.scheduled_date::date = CURRENT_DATE THEN 'today'
        WHEN t.scheduled_date::date = CURRENT_DATE + INTERVAL '1 day' THEN 'tomorrow'
        WHEN t.scheduled_date::date <= CURRENT_DATE + INTERVAL '7 days' THEN 'this_week'
        ELSE 'later'
    END AS deadline_status,
    t.scheduled_date::date < CURRENT_DATE AS is_overdue
FROM public.tasks t
WHERE t.completed = FALSE;

-- 3. View: Metas Pessoais Ativas
CREATE OR REPLACE VIEW public.personal_active_goals AS
SELECT
    g.id,
    g.user_id,
    g.name,
    g.type,
    g.amount AS target_amount,
    g.deadline,
    CASE 
        WHEN g.type = 'savings' THEN 
            COALESCE((SELECT SUM(s.amount) FROM public.savings s WHERE s.user_id = g.user_id), 0)
        ELSE 0
    END AS current_amount,
    CASE 
        WHEN g.type = 'savings' THEN 
            LEAST(100, (COALESCE((SELECT SUM(s.amount) FROM public.savings s WHERE s.user_id = g.user_id), 0) / NULLIF(g.amount, 0)) * 100)
        ELSE 0
    END AS progress_percent,
    g.deadline::date - CURRENT_DATE AS days_remaining,
    g.deadline::date < CURRENT_DATE AS is_overdue,
    CASE
        WHEN g.deadline::date < CURRENT_DATE THEN 'overdue'
        WHEN g.deadline::date <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
        WHEN g.deadline::date <= CURRENT_DATE + INTERVAL '30 days' THEN 'upcoming'
        ELSE 'on_track'
    END AS status
FROM public.goals g
WHERE g.deadline::date >= CURRENT_DATE - INTERVAL '30 days';

-- 4. View: Blocos de Tempo Próximos
CREATE OR REPLACE VIEW public.personal_upcoming_time_blocks AS
SELECT
    tb.id,
    tb.user_id,
    tb.title,
    tb.type,
    tb.date,
    tb.start_time,
    tb.end_time,
    tb.completed,
    tb.color,
    tbt.name AS type_name,
    (tb.date || ' ' || tb.start_time)::timestamp AS start_datetime,
    CASE
        WHEN tb.date::date < CURRENT_DATE THEN 'past'
        WHEN tb.date::date = CURRENT_DATE THEN 'today'
        WHEN tb.date::date = CURRENT_DATE + INTERVAL '1 day' THEN 'tomorrow'
        WHEN tb.date::date <= CURRENT_DATE + INTERVAL '7 days' THEN 'this_week'
        ELSE 'later'
    END AS day_status
FROM public.time_blocks tb
LEFT JOIN public.time_block_types tbt ON tbt.id::text = tb.type AND tbt.user_id = tb.user_id
WHERE tb.date::date >= CURRENT_DATE
  AND tb.date::date <= CURRENT_DATE + INTERVAL '14 days'
ORDER BY tb.date, tb.start_time;

-- 5. View: Projetos Pessoais (não corporativos)
CREATE OR REPLACE VIEW public.personal_projects_overview AS
SELECT
    p.id,
    p.user_id,
    p.project AS name,
    p.task AS description,
    p.status,
    p.priority,
    p.estimated_time,
    p.created_at,
    p.updated_at,
    pc.name AS category_name,
    pc.color AS category_color,
    (SELECT COUNT(*) FROM public.project_tasks pt WHERE pt.project_id = p.id) AS total_tasks,
    (SELECT COUNT(*) FROM public.project_tasks pt WHERE pt.project_id = p.id AND pt.status = 'done') AS completed_tasks,
    (SELECT COALESCE(SUM(pt.estimated_hours), 0) FROM public.project_tasks pt WHERE pt.project_id = p.id) AS total_estimated_hours,
    (SELECT COALESCE(SUM(pt.actual_hours), 0) FROM public.project_tasks pt WHERE pt.project_id = p.id) AS total_actual_hours
FROM public.projects p
LEFT JOIN public.project_categories pc ON pc.id = p.project_category_id
WHERE p.is_corporate = FALSE OR p.is_corporate IS NULL;

-- 6. View: Roteiros Pendentes
CREATE OR REPLACE VIEW public.pending_scripts AS
SELECT
    s.id,
    s.user_id,
    s.title,
    s.platform,
    s.status,
    s.scheduled_date,
    s.created_at,
    s.updated_at,
    pc.name AS project_name,
    CASE
        WHEN s.scheduled_date::date < CURRENT_DATE THEN 'overdue'
        WHEN s.scheduled_date::date = CURRENT_DATE THEN 'today'
        WHEN s.scheduled_date::date <= CURRENT_DATE + INTERVAL '7 days' THEN 'this_week'
        ELSE 'later'
    END AS deadline_status,
    s.scheduled_date::date < CURRENT_DATE AND s.status != 'published' AS is_overdue
FROM public.scripts s
LEFT JOIN public.project_categories pc ON pc.id = s.project_id
WHERE s.status != 'published';

-- 7. View: Planos de Compra Ativos
CREATE OR REPLACE VIEW public.active_purchase_plans AS
SELECT
    pp.id,
    pp.user_id,
    pp.name,
    pp.description,
    pp.target_amount,
    pp.saved_amount,
    pp.priority,
    pp.status,
    pp.category,
    pp.deadline,
    pp.image_url,
    pp.created_at,
    CASE 
        WHEN pp.target_amount > 0 THEN 
            LEAST(100, (COALESCE(pp.saved_amount, 0) / pp.target_amount) * 100)
        ELSE 0
    END AS progress_percent,
    pp.target_amount - COALESCE(pp.saved_amount, 0) AS remaining_amount,
    CASE
        WHEN pp.deadline IS NULL THEN NULL
        WHEN pp.deadline::date < CURRENT_DATE THEN 'overdue'
        WHEN pp.deadline::date <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
        WHEN pp.deadline::date <= CURRENT_DATE + INTERVAL '30 days' THEN 'upcoming'
        ELSE 'on_track'
    END AS deadline_status,
    pp.deadline::date - CURRENT_DATE AS days_to_deadline
FROM public.purchase_plans pp
WHERE pp.status != 'completed';

-- 8. View: Contas a Vencer (próximos 30 dias)
CREATE OR REPLACE VIEW public.upcoming_debts AS
SELECT
    d.id,
    d.user_id,
    d.name,
    d.amount,
    d.due_date,
    d.type,
    d.paid,
    d.installment_current,
    d.installment_total,
    d.notes,
    c.name AS category_name,
    c.color AS category_color,
    CASE
        WHEN d.due_date::date < CURRENT_DATE THEN 'overdue'
        WHEN d.due_date::date = CURRENT_DATE THEN 'today'
        WHEN d.due_date::date <= CURRENT_DATE + INTERVAL '3 days' THEN 'critical'
        WHEN d.due_date::date <= CURRENT_DATE + INTERVAL '7 days' THEN 'this_week'
        ELSE 'upcoming'
    END AS urgency_status,
    d.due_date::date - CURRENT_DATE AS days_until_due
FROM public.debts d
LEFT JOIN public.categories c ON c.id = d.category_id
WHERE d.paid = FALSE
  AND d.due_date::date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY d.due_date;

-- =====================================================
-- Enable RLS security_invoker on all views
-- =====================================================
ALTER VIEW public.personal_financial_summary SET (security_invoker = true);
ALTER VIEW public.personal_pending_tasks SET (security_invoker = true);
ALTER VIEW public.personal_active_goals SET (security_invoker = true);
ALTER VIEW public.personal_upcoming_time_blocks SET (security_invoker = true);
ALTER VIEW public.personal_projects_overview SET (security_invoker = true);
ALTER VIEW public.pending_scripts SET (security_invoker = true);
ALTER VIEW public.active_purchase_plans SET (security_invoker = true);
ALTER VIEW public.upcoming_debts SET (security_invoker = true);

-- =====================================================
-- RPC Function: get_personal_360_summary
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_personal_360_summary(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
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
$$;