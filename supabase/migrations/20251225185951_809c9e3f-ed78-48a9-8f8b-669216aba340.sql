-- Function to update sales goals when prospect status changes
CREATE OR REPLACE FUNCTION public.update_sales_goals_on_prospect_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When status changes TO 'fechado'
  IF NEW.status = 'fechado' AND (OLD.status IS NULL OR OLD.status <> 'fechado') THEN
    -- Update 'faturamento_mensal' goals: add estimated_value
    UPDATE public.sales_goals
    SET current_amount = current_amount + NEW.estimated_value,
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND goal_type = 'faturamento_mensal'
      AND start_date <= NEW.prospection_date
      AND end_date >= NEW.prospection_date
      AND (project_id IS NULL OR project_id = NEW.project_id);

    -- Update 'vendas_fechadas' goals: add 1
    UPDATE public.sales_goals
    SET current_amount = current_amount + 1,
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND goal_type = 'vendas_fechadas'
      AND start_date <= NEW.prospection_date
      AND end_date >= NEW.prospection_date
      AND (project_id IS NULL OR project_id = NEW.project_id);
  
  -- When status changes FROM 'fechado' to something else
  ELSIF OLD.status = 'fechado' AND NEW.status <> 'fechado' THEN
    -- Revert 'faturamento_mensal' goals: subtract estimated_value
    UPDATE public.sales_goals
    SET current_amount = GREATEST(0, current_amount - OLD.estimated_value),
        updated_at = now()
    WHERE user_id = OLD.user_id
      AND goal_type = 'faturamento_mensal'
      AND start_date <= OLD.prospection_date
      AND end_date >= OLD.prospection_date
      AND (project_id IS NULL OR project_id = OLD.project_id);

    -- Revert 'vendas_fechadas' goals: subtract 1
    UPDATE public.sales_goals
    SET current_amount = GREATEST(0, current_amount - 1),
        updated_at = now()
    WHERE user_id = OLD.user_id
      AND goal_type = 'vendas_fechadas'
      AND start_date <= OLD.prospection_date
      AND end_date >= OLD.prospection_date
      AND (project_id IS NULL OR project_id = OLD.project_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Function to revert sales goals when a 'fechado' prospect is deleted
CREATE OR REPLACE FUNCTION public.revert_sales_goals_on_prospect_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only revert if the deleted prospect was 'fechado'
  IF OLD.status = 'fechado' THEN
    -- Revert 'faturamento_mensal' goals
    UPDATE public.sales_goals
    SET current_amount = GREATEST(0, current_amount - OLD.estimated_value),
        updated_at = now()
    WHERE user_id = OLD.user_id
      AND goal_type = 'faturamento_mensal'
      AND start_date <= OLD.prospection_date
      AND end_date >= OLD.prospection_date
      AND (project_id IS NULL OR project_id = OLD.project_id);

    -- Revert 'vendas_fechadas' goals
    UPDATE public.sales_goals
    SET current_amount = GREATEST(0, current_amount - 1),
        updated_at = now()
    WHERE user_id = OLD.user_id
      AND goal_type = 'vendas_fechadas'
      AND start_date <= OLD.prospection_date
      AND end_date >= OLD.prospection_date
      AND (project_id IS NULL OR project_id = OLD.project_id);
  END IF;

  RETURN OLD;
END;
$$;

-- Trigger for status changes
CREATE TRIGGER trigger_prospect_status_change
  AFTER UPDATE OF status ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sales_goals_on_prospect_change();

-- Trigger for deletions
CREATE TRIGGER trigger_prospect_delete
  BEFORE DELETE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_sales_goals_on_prospect_delete();