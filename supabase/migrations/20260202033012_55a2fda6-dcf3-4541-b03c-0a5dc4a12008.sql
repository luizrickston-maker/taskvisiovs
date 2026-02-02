-- =====================================================
-- CÉREBRO OPERACIONAL - Infraestrutura de Agregação de Dados
-- =====================================================

-- 1. VIEW: corporate_pending_tasks
-- Tarefas pendentes de projetos corporativos
CREATE OR REPLACE VIEW public.corporate_pending_tasks AS
SELECT 
  pt.id,
  pt.user_id,
  pt.project_id,
  pt.title,
  pt.description,
  pt.status,
  pt.priority,
  pt.deadline,
  pt.estimated_hours,
  pt.actual_hours,
  pt.created_at,
  p.project AS project_name,
  p.client_name,
  p.company_name,
  CASE 
    WHEN pt.deadline < CURRENT_DATE AND pt.status != 'done' THEN true 
    ELSE false 
  END AS is_overdue,
  CASE 
    WHEN pt.deadline = CURRENT_DATE THEN 'today'
    WHEN pt.deadline = CURRENT_DATE + 1 THEN 'tomorrow'
    WHEN pt.deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 THEN 'this_week'
    WHEN pt.deadline < CURRENT_DATE THEN 'overdue'
    ELSE 'future'
  END AS deadline_status
FROM public.project_tasks pt
LEFT JOIN public.projects p ON pt.project_id = p.id
WHERE pt.status != 'done'
  AND (p.is_corporate = true OR p.is_corporate IS NULL);

-- 2. VIEW: sales_pipeline_summary
-- Resumo do pipeline de vendas com métricas
CREATE OR REPLACE VIEW public.sales_pipeline_summary AS
SELECT 
  pr.id,
  pr.user_id,
  pr.client_name,
  pr.company_name,
  pr.status,
  pr.estimated_value,
  pr.prospection_date,
  pr.project_type,
  pr.payment_type,
  pr.contract_duration,
  pr.plan_id,
  sp.name AS plan_name,
  CASE 
    WHEN pr.status = 'novo' THEN 1
    WHEN pr.status = 'em_negociacao' THEN 2
    WHEN pr.status = 'proposta_enviada' THEN 3
    WHEN pr.status = 'fechado' THEN 4
    WHEN pr.status = 'perdido' THEN 5
  END AS stage_order,
  CASE 
    WHEN pr.status = 'novo' THEN 10
    WHEN pr.status = 'em_negociacao' THEN 30
    WHEN pr.status = 'proposta_enviada' THEN 60
    WHEN pr.status = 'fechado' THEN 100
    ELSE 0
  END AS conversion_probability,
  (pr.estimated_value * 
    CASE 
      WHEN pr.status = 'novo' THEN 0.10
      WHEN pr.status = 'em_negociacao' THEN 0.30
      WHEN pr.status = 'proposta_enviada' THEN 0.60
      WHEN pr.status = 'fechado' THEN 1.0
      ELSE 0
    END
  ) AS weighted_value,
  pr.created_at,
  pr.updated_at
FROM public.prospects pr
LEFT JOIN public.service_plans sp ON pr.plan_id = sp.id;

-- 3. VIEW: upcoming_appointments
-- Compromissos futuros da agenda
CREATE OR REPLACE VIEW public.upcoming_appointments AS
SELECT 
  tb.id,
  tb.user_id,
  tb.title,
  tb.date,
  tb.start_time,
  tb.end_time,
  tb.type,
  tb.completed,
  tb.color,
  tbt.name AS type_name,
  CASE 
    WHEN tb.date = CURRENT_DATE THEN 'today'
    WHEN tb.date = CURRENT_DATE + 1 THEN 'tomorrow'
    WHEN tb.date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 THEN 'this_week'
    ELSE 'future'
  END AS day_status,
  (tb.date || ' ' || tb.start_time)::timestamp AS start_datetime
FROM public.time_blocks tb
LEFT JOIN public.time_block_types tbt ON tb.type = tbt.id::text
WHERE tb.date >= CURRENT_DATE
ORDER BY tb.date, tb.start_time;

-- 4. VIEW: pending_editorial_content
-- Conteúdos editoriais pendentes
CREATE OR REPLACE VIEW public.pending_editorial_content AS
SELECT 
  eci.id,
  eci.user_id,
  eci.project_id,
  eci.title,
  eci.description,
  eci.due_date,
  eci.status,
  eci.platform,
  eci.content_type,
  eci.assigned_to,
  ct.name AS assigned_name,
  p.project AS project_name,
  CASE 
    WHEN eci.due_date::date < CURRENT_DATE AND eci.status != 'published' THEN true 
    ELSE false 
  END AS is_overdue,
  CASE 
    WHEN eci.due_date::date = CURRENT_DATE THEN 'today'
    WHEN eci.due_date::date = CURRENT_DATE + 1 THEN 'tomorrow'
    WHEN eci.due_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 THEN 'this_week'
    WHEN eci.due_date::date < CURRENT_DATE THEN 'overdue'
    ELSE 'future'
  END AS deadline_status,
  eci.created_at,
  eci.updated_at
FROM public.editorial_calendar_items eci
LEFT JOIN public.corporate_team ct ON eci.assigned_to = ct.id
LEFT JOIN public.projects p ON eci.project_id = p.id
WHERE eci.status != 'published';

-- 5. VIEW: projects_overview
-- Visão geral de projetos com progresso
CREATE OR REPLACE VIEW public.projects_overview AS
SELECT 
  p.id,
  p.user_id,
  p.project AS name,
  p.task AS description,
  p.status,
  p.priority,
  p.deadline,
  p.is_corporate,
  p.client_name,
  p.company_name,
  p.prospect_id,
  pc.name AS category_name,
  pc.color AS category_color,
  (SELECT COUNT(*) FROM public.project_tasks pt WHERE pt.project_id = p.id) AS total_tasks,
  (SELECT COUNT(*) FROM public.project_tasks pt WHERE pt.project_id = p.id AND pt.status = 'done') AS completed_tasks,
  (SELECT COALESCE(SUM(estimated_hours), 0) FROM public.project_tasks pt WHERE pt.project_id = p.id) AS total_estimated_hours,
  (SELECT COALESCE(SUM(actual_hours), 0) FROM public.project_tasks pt WHERE pt.project_id = p.id) AS total_actual_hours,
  CASE 
    WHEN p.deadline < CURRENT_DATE AND p.status != 'done' THEN true 
    ELSE false 
  END AS is_overdue,
  p.created_at,
  p.updated_at
FROM public.projects p
LEFT JOIN public.project_categories pc ON p.project_category_id = pc.id;

-- 6. VIEW: sales_goals_progress
-- Progresso das metas de vendas
CREATE OR REPLACE VIEW public.sales_goals_progress AS
SELECT 
  sg.id,
  sg.user_id,
  sg.goal_type,
  sg.target_amount,
  sg.current_amount,
  sg.start_date,
  sg.end_date,
  sg.project_id,
  p.project AS project_name,
  CASE 
    WHEN sg.target_amount > 0 THEN ROUND((sg.current_amount / sg.target_amount * 100)::numeric, 1)
    ELSE 0
  END AS progress_percent,
  (sg.target_amount - sg.current_amount) AS remaining_amount,
  CASE 
    WHEN sg.end_date < CURRENT_DATE THEN 'expired'
    WHEN sg.current_amount >= sg.target_amount THEN 'achieved'
    WHEN sg.end_date <= CURRENT_DATE + 7 THEN 'urgent'
    ELSE 'on_track'
  END AS status,
  (sg.end_date - CURRENT_DATE) AS days_remaining
FROM public.sales_goals sg
LEFT JOIN public.projects p ON sg.project_id = p.id
WHERE sg.end_date >= CURRENT_DATE - 30;

-- =====================================================
-- FUNÇÃO: get_user_360_summary
-- Retorna JSON consolidado com todos os dados do usuário
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_360_summary(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
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
$$;

-- Grant execute permission para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_user_360_summary(UUID) TO authenticated;