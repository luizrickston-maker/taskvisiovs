-- =====================================================
-- Sincroniza Gestão de Time (corporate_team) com Contas a Pagar (pj_contas_pagar)
-- Ao criar/editar/remover colaborador, a conta a pagar correspondente é
-- criada/atualizada/cancelada automaticamente. O corporate_team continua
-- sendo a fonte da verdade (aparece em Time); a conta apenas reflete o valor.
-- =====================================================

-- 1. Coluna de vínculo (evita duplicatas e permite sincronizar)
ALTER TABLE public.pj_contas_pagar
  ADD COLUMN IF NOT EXISTS corporate_team_id uuid
  REFERENCES public.corporate_team(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pj_contas_pagar_corporate_team
  ON public.pj_contas_pagar(corporate_team_id);

-- 2. Função de sincronização
CREATE OR REPLACE FUNCTION public.sync_corporate_team_conta_pagar()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ws       uuid;
  v_valor    numeric(15,2);
  v_due      date;
  v_recor    boolean;
  v_freq     text;
  v_cat      uuid;
  v_desc     text;
  v_day      int;
  v_last_day int;
BEGIN
  -- DELETE: remove contas não pagas vinculadas; pagas mantêm histórico (link some via FK)
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.pj_contas_pagar
    WHERE corporate_team_id = OLD.id AND status <> 'pago';
    RETURN OLD;
  END IF;

  -- Resolve workspace (no insert direto sem e-mail, workspace_id pode vir nulo)
  v_ws := NEW.workspace_id;
  IF v_ws IS NULL THEN
    SELECT id INTO v_ws FROM public.workspaces WHERE owner_user_id = NEW.user_id LIMIT 1;
  END IF;

  -- Sem workspace, custo zero ou inativo → cancela conta vinculada (se houver) e sai
  IF v_ws IS NULL OR COALESCE(NEW.cost, 0) <= 0 OR NEW.is_active = false THEN
    UPDATE public.pj_contas_pagar
      SET status = 'cancelado', updated_at = now()
    WHERE corporate_team_id = NEW.id AND status <> 'pago';
    RETURN NEW;
  END IF;

  -- Valor: CLT = salário + ~70% encargos + benefícios; PJ/freelancer = custo
  IF NEW.contract_type = 'clt' THEN
    v_valor := NEW.cost + (NEW.cost * 0.7) + COALESCE(NEW.clt_benefits, 0);
  ELSE
    v_valor := NEW.cost;
  END IF;

  -- Recorrência: PJ e CLT recorrem mensalmente; freelancer é lançamento único
  v_recor := (NEW.contract_type <> 'freelancer');
  v_freq  := CASE WHEN v_recor THEN 'mensal' ELSE NULL END;

  -- Vencimento: payment_day no mês corrente, limitado ao último dia do mês
  v_last_day := EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int;
  v_day := LEAST(GREATEST(COALESCE(NEW.payment_day, 5), 1), v_last_day);
  v_due := (date_trunc('month', CURRENT_DATE) + (v_day - 1) * INTERVAL '1 day')::date;

  -- Categoria "Equipe / Salários" (cria sob demanda)
  SELECT id INTO v_cat FROM public.pj_caixa_categorias
    WHERE workspace_id = v_ws AND nome = 'Equipe / Salários' LIMIT 1;
  IF v_cat IS NULL THEN
    INSERT INTO public.pj_caixa_categorias (workspace_id, nome, tipo, cor)
    VALUES (v_ws, 'Equipe / Salários', 'saida', '#8b5cf6')
    RETURNING id INTO v_cat;
  END IF;

  v_desc := 'Pagamento equipe — ' || NEW.name || COALESCE(' (' || NULLIF(NEW.role, '') || ')', '');

  -- Upsert da conta vinculada (não mexe em conta já 'pago')
  IF EXISTS (SELECT 1 FROM public.pj_contas_pagar WHERE corporate_team_id = NEW.id) THEN
    UPDATE public.pj_contas_pagar SET
      descricao       = v_desc,
      fornecedor      = NEW.name,
      valor           = v_valor,
      data_vencimento = CASE WHEN status = 'pago' THEN data_vencimento ELSE v_due END,
      categoria_id    = COALESCE(categoria_id, v_cat),
      recorrente      = v_recor,
      frequencia      = v_freq,
      status          = CASE WHEN status = 'cancelado' THEN 'pendente' ELSE status END,
      updated_at      = now()
    WHERE corporate_team_id = NEW.id AND status <> 'pago';
  ELSE
    INSERT INTO public.pj_contas_pagar (
      workspace_id, descricao, fornecedor, valor, data_vencimento,
      status, categoria_id, recorrente, frequencia, created_by,
      corporate_team_id, observacoes
    ) VALUES (
      v_ws, v_desc, NEW.name, v_valor, v_due,
      'pendente', v_cat, v_recor, v_freq, NEW.user_id,
      NEW.id, 'Gerado automaticamente a partir da Gestão de Time'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Trigger
DROP TRIGGER IF EXISTS trg_sync_corporate_team_conta_pagar ON public.corporate_team;
CREATE TRIGGER trg_sync_corporate_team_conta_pagar
  AFTER INSERT OR UPDATE OR DELETE ON public.corporate_team
  FOR EACH ROW EXECUTE FUNCTION public.sync_corporate_team_conta_pagar();

-- 4. Backfill: gera contas para colaboradores ativos já existentes
--    (o UPDATE dispara o trigger, que cria a conta de quem ainda não tem)
UPDATE public.corporate_team SET updated_at = now() WHERE is_active = true;