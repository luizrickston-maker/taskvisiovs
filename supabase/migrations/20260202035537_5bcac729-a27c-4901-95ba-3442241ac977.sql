-- Fix Security Definer Views: Enable security_invoker to respect underlying table RLS policies
-- This ensures each view respects the RLS policies of the tables it queries

-- Apply security_invoker to all views that expose user data
ALTER VIEW projects_overview SET (security_invoker = true);
ALTER VIEW corporate_pending_tasks SET (security_invoker = true);
ALTER VIEW sales_pipeline_summary SET (security_invoker = true);
ALTER VIEW sales_goals_progress SET (security_invoker = true);
ALTER VIEW upcoming_appointments SET (security_invoker = true);
ALTER VIEW pending_editorial_content SET (security_invoker = true);