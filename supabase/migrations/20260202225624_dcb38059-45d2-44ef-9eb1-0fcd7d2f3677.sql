
-- =====================================================
-- MIGRAÇÃO DE SEGURANÇA: Adicionar security_invoker = true a todas as views
-- Isso garante que as views respeitem as políticas RLS das tabelas base
-- =====================================================

-- 1. active_purchase_plans
DROP VIEW IF EXISTS public.active_purchase_plans;
CREATE VIEW public.active_purchase_plans
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  name,
  description,
  target_amount,
  saved_amount,
  priority,
  status,
  category,
  deadline,
  image_url,
  created_at,
  CASE
    WHEN target_amount > 0::numeric THEN LEAST(100::numeric, COALESCE(saved_amount, 0::numeric) / target_amount * 100::numeric)
    ELSE 0::numeric
  END AS progress_percent,
  target_amount - COALESCE(saved_amount, 0::numeric) AS remaining_amount,
  CASE
    WHEN deadline IS NULL THEN NULL::text
    WHEN deadline < CURRENT_DATE THEN 'overdue'::text
    WHEN deadline <= (CURRENT_DATE + '7 days'::interval) THEN 'urgent'::text
    WHEN deadline <= (CURRENT_DATE + '30 days'::interval) THEN 'upcoming'::text
    ELSE 'on_track'::text
  END AS deadline_status,
  deadline - CURRENT_DATE AS days_to_deadline
FROM purchase_plans pp
WHERE status <> 'completed'::text;

-- 2. corporate_pending_tasks
DROP VIEW IF EXISTS public.corporate_pending_tasks;
CREATE VIEW public.corporate_pending_tasks
WITH (security_invoker = true)
AS
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
    WHEN pt.deadline < CURRENT_DATE AND pt.status <> 'done'::text THEN true
    ELSE false
  END AS is_overdue,
  CASE
    WHEN pt.deadline = CURRENT_DATE THEN 'today'::text
    WHEN pt.deadline = (CURRENT_DATE + 1) THEN 'tomorrow'::text
    WHEN pt.deadline >= CURRENT_DATE AND pt.deadline <= (CURRENT_DATE + 7) THEN 'this_week'::text
    WHEN pt.deadline < CURRENT_DATE THEN 'overdue'::text
    ELSE 'future'::text
  END AS deadline_status
FROM project_tasks pt
LEFT JOIN projects p ON pt.project_id = p.id
WHERE pt.status <> 'done'::text AND (p.is_corporate = true OR p.is_corporate IS NULL);

-- 3. pending_editorial_content
DROP VIEW IF EXISTS public.pending_editorial_content;
CREATE VIEW public.pending_editorial_content
WITH (security_invoker = true)
AS
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
    WHEN eci.due_date::date < CURRENT_DATE AND eci.status <> 'published'::content_status THEN true
    ELSE false
  END AS is_overdue,
  CASE
    WHEN eci.due_date::date = CURRENT_DATE THEN 'today'::text
    WHEN eci.due_date::date = (CURRENT_DATE + 1) THEN 'tomorrow'::text
    WHEN eci.due_date::date >= CURRENT_DATE AND eci.due_date::date <= (CURRENT_DATE + 7) THEN 'this_week'::text
    WHEN eci.due_date::date < CURRENT_DATE THEN 'overdue'::text
    ELSE 'future'::text
  END AS deadline_status,
  eci.created_at,
  eci.updated_at
FROM editorial_calendar_items eci
LEFT JOIN corporate_team ct ON eci.assigned_to = ct.id
LEFT JOIN projects p ON eci.project_id = p.id
WHERE eci.status <> 'published'::content_status;

-- 4. pending_scripts
DROP VIEW IF EXISTS public.pending_scripts;
CREATE VIEW public.pending_scripts
WITH (security_invoker = true)
AS
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
    WHEN s.scheduled_date < CURRENT_DATE THEN 'overdue'::text
    WHEN s.scheduled_date = CURRENT_DATE THEN 'today'::text
    WHEN s.scheduled_date <= (CURRENT_DATE + '7 days'::interval) THEN 'this_week'::text
    ELSE 'later'::text
  END AS deadline_status,
  s.scheduled_date < CURRENT_DATE AND s.status <> 'published'::text AS is_overdue
FROM scripts s
LEFT JOIN project_categories pc ON pc.id = s.project_id
WHERE s.status <> 'published'::text;

-- 5. personal_active_goals
DROP VIEW IF EXISTS public.personal_active_goals;
CREATE VIEW public.personal_active_goals
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  name,
  type,
  amount AS target_amount,
  deadline,
  CASE
    WHEN type = 'savings'::text THEN COALESCE((
      SELECT sum(s.amount) 
      FROM savings s
      WHERE s.user_id = g.user_id
    ), 0::numeric)
    ELSE 0::numeric
  END AS current_amount,
  CASE
    WHEN type = 'savings'::text THEN LEAST(100::numeric, COALESCE((
      SELECT sum(s.amount) 
      FROM savings s
      WHERE s.user_id = g.user_id
    ), 0::numeric) / NULLIF(amount, 0::numeric) * 100::numeric)
    ELSE 0::numeric
  END AS progress_percent,
  deadline - CURRENT_DATE AS days_remaining,
  deadline < CURRENT_DATE AS is_overdue,
  CASE
    WHEN deadline < CURRENT_DATE THEN 'overdue'::text
    WHEN deadline <= (CURRENT_DATE + '7 days'::interval) THEN 'urgent'::text
    WHEN deadline <= (CURRENT_DATE + '30 days'::interval) THEN 'upcoming'::text
    ELSE 'on_track'::text
  END AS status
FROM goals g
WHERE deadline >= (CURRENT_DATE - '30 days'::interval);

-- 6. personal_financial_summary
DROP VIEW IF EXISTS public.personal_financial_summary;
CREATE VIEW public.personal_financial_summary
WITH (security_invoker = true)
AS
SELECT 
  i.user_id,
  COALESCE(sum(i.amount), 0::numeric) AS total_income_this_month,
  (
    SELECT COALESCE(sum(e.amount), 0::numeric)
    FROM expenses e
    WHERE e.user_id = i.user_id 
      AND date_trunc('month'::text, e.date::timestamp with time zone) = date_trunc('month'::text, CURRENT_DATE::timestamp with time zone)
  ) AS total_expenses_this_month,
  (
    SELECT COALESCE(sum(d.amount), 0::numeric)
    FROM debts d
    WHERE d.user_id = i.user_id AND d.paid = false
  ) AS total_pending_debts,
  (
    SELECT count(*)
    FROM debts d
    WHERE d.user_id = i.user_id AND d.paid = false AND d.due_date <= CURRENT_DATE
  ) AS overdue_debts_count,
  (
    SELECT COALESCE(sum(s.amount), 0::numeric)
    FROM savings s
    WHERE s.user_id = i.user_id
  ) AS total_savings
FROM incomes i
WHERE date_trunc('month'::text, i.date::timestamp with time zone) = date_trunc('month'::text, CURRENT_DATE::timestamp with time zone)
GROUP BY i.user_id
UNION ALL
SELECT DISTINCT 
  u.user_id,
  0 AS total_income_this_month,
  COALESCE((
    SELECT sum(e.amount) 
    FROM expenses e
    WHERE e.user_id = u.user_id 
      AND date_trunc('month'::text, e.date::timestamp with time zone) = date_trunc('month'::text, CURRENT_DATE::timestamp with time zone)
  ), 0::numeric) AS total_expenses_this_month,
  COALESCE((
    SELECT sum(d.amount) 
    FROM debts d
    WHERE d.user_id = u.user_id AND d.paid = false
  ), 0::numeric) AS total_pending_debts,
  (
    SELECT count(*) 
    FROM debts d
    WHERE d.user_id = u.user_id AND d.paid = false AND d.due_date <= CURRENT_DATE
  ) AS overdue_debts_count,
  COALESCE((
    SELECT sum(s.amount) 
    FROM savings s
    WHERE s.user_id = u.user_id
  ), 0::numeric) AS total_savings
FROM (
  SELECT expenses.user_id FROM expenses
  UNION
  SELECT debts.user_id FROM debts
  UNION
  SELECT savings.user_id FROM savings
) u
WHERE NOT (u.user_id IN (
  SELECT DISTINCT incomes.user_id
  FROM incomes
  WHERE date_trunc('month'::text, incomes.date::timestamp with time zone) = date_trunc('month'::text, CURRENT_DATE::timestamp with time zone)
));

-- 7. personal_pending_tasks
DROP VIEW IF EXISTS public.personal_pending_tasks;
CREATE VIEW public.personal_pending_tasks
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  title,
  type,
  scheduled_date,
  created_at,
  CASE
    WHEN scheduled_date IS NULL THEN 'inbox'::text
    WHEN scheduled_date < CURRENT_DATE THEN 'overdue'::text
    WHEN scheduled_date = CURRENT_DATE THEN 'today'::text
    WHEN scheduled_date = (CURRENT_DATE + '1 day'::interval) THEN 'tomorrow'::text
    WHEN scheduled_date <= (CURRENT_DATE + '7 days'::interval) THEN 'this_week'::text
    ELSE 'later'::text
  END AS deadline_status,
  scheduled_date < CURRENT_DATE AS is_overdue
FROM tasks t
WHERE completed = false;

-- 8. personal_projects_overview
DROP VIEW IF EXISTS public.personal_projects_overview;
CREATE VIEW public.personal_projects_overview
WITH (security_invoker = true)
AS
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
  (SELECT count(*) FROM project_tasks pt WHERE pt.project_id = p.id) AS total_tasks,
  (SELECT count(*) FROM project_tasks pt WHERE pt.project_id = p.id AND pt.status = 'done'::text) AS completed_tasks,
  (SELECT COALESCE(sum(pt.estimated_hours), 0::numeric) FROM project_tasks pt WHERE pt.project_id = p.id) AS total_estimated_hours,
  (SELECT COALESCE(sum(pt.actual_hours), 0::numeric) FROM project_tasks pt WHERE pt.project_id = p.id) AS total_actual_hours
FROM projects p
LEFT JOIN project_categories pc ON pc.id = p.project_category_id
WHERE p.is_corporate = false OR p.is_corporate IS NULL;

-- 9. personal_upcoming_time_blocks
DROP VIEW IF EXISTS public.personal_upcoming_time_blocks;
CREATE VIEW public.personal_upcoming_time_blocks
WITH (security_invoker = true)
AS
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
  ((tb.date || ' '::text) || tb.start_time)::timestamp without time zone AS start_datetime,
  CASE
    WHEN tb.date < CURRENT_DATE THEN 'past'::text
    WHEN tb.date = CURRENT_DATE THEN 'today'::text
    WHEN tb.date = (CURRENT_DATE + '1 day'::interval) THEN 'tomorrow'::text
    WHEN tb.date <= (CURRENT_DATE + '7 days'::interval) THEN 'this_week'::text
    ELSE 'later'::text
  END AS day_status
FROM time_blocks tb
LEFT JOIN time_block_types tbt ON tbt.id::text = tb.type AND tbt.user_id = tb.user_id
WHERE tb.date >= CURRENT_DATE AND tb.date <= (CURRENT_DATE + '14 days'::interval)
ORDER BY tb.date, tb.start_time;

-- 10. projects_overview
DROP VIEW IF EXISTS public.projects_overview;
CREATE VIEW public.projects_overview
WITH (security_invoker = true)
AS
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
  (SELECT count(*) FROM project_tasks pt WHERE pt.project_id = p.id) AS total_tasks,
  (SELECT count(*) FROM project_tasks pt WHERE pt.project_id = p.id AND pt.status = 'done'::text) AS completed_tasks,
  (SELECT COALESCE(sum(pt.estimated_hours), 0::numeric) FROM project_tasks pt WHERE pt.project_id = p.id) AS total_estimated_hours,
  (SELECT COALESCE(sum(pt.actual_hours), 0::numeric) FROM project_tasks pt WHERE pt.project_id = p.id) AS total_actual_hours,
  CASE
    WHEN p.deadline < CURRENT_DATE AND p.status <> 'done'::text THEN true
    ELSE false
  END AS is_overdue,
  p.created_at,
  p.updated_at
FROM projects p
LEFT JOIN project_categories pc ON p.project_category_id = pc.id;

-- 11. sales_goals_progress
DROP VIEW IF EXISTS public.sales_goals_progress;
CREATE VIEW public.sales_goals_progress
WITH (security_invoker = true)
AS
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
    WHEN sg.target_amount > 0::numeric THEN round(sg.current_amount / sg.target_amount * 100::numeric, 1)
    ELSE 0::numeric
  END AS progress_percent,
  sg.target_amount - sg.current_amount AS remaining_amount,
  CASE
    WHEN sg.end_date < CURRENT_DATE THEN 'expired'::text
    WHEN sg.current_amount >= sg.target_amount THEN 'achieved'::text
    WHEN sg.end_date <= (CURRENT_DATE + 7) THEN 'urgent'::text
    ELSE 'on_track'::text
  END AS status,
  sg.end_date - CURRENT_DATE AS days_remaining
FROM sales_goals sg
LEFT JOIN projects p ON sg.project_id = p.id
WHERE sg.end_date >= (CURRENT_DATE - 30);

-- 12. sales_pipeline_summary
DROP VIEW IF EXISTS public.sales_pipeline_summary;
CREATE VIEW public.sales_pipeline_summary
WITH (security_invoker = true)
AS
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
    WHEN pr.status = 'novo'::text THEN 1
    WHEN pr.status = 'em_negociacao'::text THEN 2
    WHEN pr.status = 'proposta_enviada'::text THEN 3
    WHEN pr.status = 'fechado'::text THEN 4
    WHEN pr.status = 'perdido'::text THEN 5
    ELSE NULL::integer
  END AS stage_order,
  CASE
    WHEN pr.status = 'novo'::text THEN 10
    WHEN pr.status = 'em_negociacao'::text THEN 30
    WHEN pr.status = 'proposta_enviada'::text THEN 60
    WHEN pr.status = 'fechado'::text THEN 100
    ELSE 0
  END AS conversion_probability,
  pr.estimated_value *
    CASE
      WHEN pr.status = 'novo'::text THEN 0.10
      WHEN pr.status = 'em_negociacao'::text THEN 0.30
      WHEN pr.status = 'proposta_enviada'::text THEN 0.60
      WHEN pr.status = 'fechado'::text THEN 1.0
      ELSE 0::numeric
    END AS weighted_value,
  pr.created_at,
  pr.updated_at
FROM prospects pr
LEFT JOIN service_plans sp ON pr.plan_id = sp.id;

-- 13. upcoming_appointments
DROP VIEW IF EXISTS public.upcoming_appointments;
CREATE VIEW public.upcoming_appointments
WITH (security_invoker = true)
AS
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
    WHEN tb.date = CURRENT_DATE THEN 'today'::text
    WHEN tb.date = (CURRENT_DATE + 1) THEN 'tomorrow'::text
    WHEN tb.date >= CURRENT_DATE AND tb.date <= (CURRENT_DATE + 7) THEN 'this_week'::text
    ELSE 'future'::text
  END AS day_status,
  ((tb.date || ' '::text) || tb.start_time)::timestamp without time zone AS start_datetime
FROM time_blocks tb
LEFT JOIN time_block_types tbt ON tb.type = tbt.id::text
WHERE tb.date >= CURRENT_DATE
ORDER BY tb.date, tb.start_time;

-- 14. upcoming_debts
DROP VIEW IF EXISTS public.upcoming_debts;
CREATE VIEW public.upcoming_debts
WITH (security_invoker = true)
AS
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
    WHEN d.due_date < CURRENT_DATE THEN 'overdue'::text
    WHEN d.due_date = CURRENT_DATE THEN 'today'::text
    WHEN d.due_date <= (CURRENT_DATE + '3 days'::interval) THEN 'critical'::text
    WHEN d.due_date <= (CURRENT_DATE + '7 days'::interval) THEN 'this_week'::text
    ELSE 'upcoming'::text
  END AS urgency_status,
  d.due_date - CURRENT_DATE AS days_until_due
FROM debts d
LEFT JOIN categories c ON c.id = d.category_id
WHERE d.paid = false AND d.due_date <= (CURRENT_DATE + '30 days'::interval)
ORDER BY d.due_date;

-- Comentário: Todas as views agora possuem security_invoker = true
-- Isso significa que as consultas às views respeitarão as políticas RLS das tabelas base
