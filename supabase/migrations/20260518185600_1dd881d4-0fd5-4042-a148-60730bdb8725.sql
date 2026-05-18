CREATE OR REPLACE FUNCTION public.update_sales_goals_on_prospect_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    target_date DATE;
BEGIN
  -- Use current date for goal period validation when closing a sale
  target_date := CURRENT_DATE;

  -- When status changes TO 'fechado'
  IF NEW.status = 'fechado' AND (OLD.status IS NULL OR OLD.status <> 'fechado') THEN
    -- Update 'faturamento_mensal' goals: add estimated_value
    UPDATE public.sales_goals
    SET current_amount = current_amount + NEW.estimated_value,
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND goal_type = 'faturamento_mensal'
      AND start_date <= target_date
      AND end_date >= target_date
      AND (project_id IS NULL OR project_id = NEW.project_id);

    -- Update 'vendas_fechadas' goals: add 1
    UPDATE public.sales_goals
    SET current_amount = current_amount + 1,
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND goal_type = 'vendas_fechadas'
      AND start_date <= target_date
      AND end_date >= target_date
      AND (project_id IS NULL OR project_id = NEW.project_id);

    -- Update 'novos_clientes' goals: add 1
    UPDATE public.sales_goals
    SET current_amount = current_amount + 1,
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND goal_type = 'novos_clientes'
      AND start_date <= target_date
      AND end_date >= target_date
      AND (project_id IS NULL OR project_id = NEW.project_id);
  
  -- When status changes FROM 'fechado' to something else
  ELSIF OLD.status = 'fechado' AND NEW.status <> 'fechado' THEN
    -- Revert 'faturamento_mensal' goals: subtract estimated_value
    UPDATE public.sales_goals
    SET current_amount = GREATEST(0, current_amount - OLD.estimated_value),
        updated_at = now()
    WHERE user_id = OLD.user_id
      AND goal_type = 'faturamento_mensal'
      AND start_date <= target_date
      AND end_date >= target_date
      AND (project_id IS NULL OR project_id = OLD.project_id);

    -- Revert 'vendas_fechadas' goals: subtract 1
    UPDATE public.sales_goals
    SET current_amount = GREATEST(0, current_amount - 1),
        updated_at = now()
    WHERE user_id = OLD.user_id
      AND goal_type = 'vendas_fechadas'
      AND start_date <= target_date
      AND end_date >= target_date
      AND (project_id IS NULL OR project_id = OLD.project_id);

    -- Revert 'novos_clientes' goals: subtract 1
    UPDATE public.sales_goals
    SET current_amount = GREATEST(0, current_amount - 1),
        updated_at = now()
    WHERE user_id = OLD.user_id
      AND goal_type = 'novos_clientes'
      AND start_date <= target_date
      AND end_date >= target_date
      AND (project_id IS NULL OR project_id = OLD.project_id);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revert_sales_goals_on_prospect_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    target_date DATE;
BEGIN
  target_date := CURRENT_DATE;

  -- Only revert if the deleted prospect was 'fechado'
  IF OLD.status = 'fechado' THEN
    -- Revert 'faturamento_mensal' goals
    UPDATE public.sales_goals
    SET current_amount = GREATEST(0, current_amount - OLD.estimated_value),
        updated_at = now()
    WHERE user_id = OLD.user_id
      AND goal_type = 'faturamento_mensal'
      AND start_date <= target_date
      AND end_date >= target_date
      AND (project_id IS NULL OR project_id = OLD.project_id);

    -- Revert 'vendas_fechadas' goals
    UPDATE public.sales_goals
    SET current_amount = GREATEST(0, current_amount - 1),
        updated_at = now()
    WHERE user_id = OLD.user_id
      AND goal_type = 'vendas_fechadas'
      AND start_date <= target_date
      AND end_date >= target_date
      AND (project_id IS NULL OR project_id = OLD.project_id);

    -- Revert 'novos_clientes' goals
    UPDATE public.sales_goals
    SET current_amount = GREATEST(0, current_amount - 1),
        updated_at = now()
    WHERE user_id = OLD.user_id
      AND goal_type = 'novos_clientes'
      AND start_date <= target_date
      AND end_date >= target_date
      AND (project_id IS NULL OR project_id = OLD.project_id);
  END IF;

  RETURN OLD;
END;
$function$;