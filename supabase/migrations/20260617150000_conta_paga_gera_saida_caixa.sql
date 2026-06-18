-- Quando uma conta a pagar é marcada como PAGA, lança automaticamente uma
-- SAÍDA no Caixa PJ (pj_caixa_transacoes), descontando do saldo disponível.
--
-- Implementado via trigger para garantir consistência seja qual for a origem
-- do pagamento (IA, tela manual ou SQL direto). Idempotente: usa a coluna
-- `referencia` ('conta_pagar:<id>') para não duplicar o lançamento.
-- Se o pagamento for revertido (pago -> pendente/cancelado), remove a saída.

CREATE OR REPLACE FUNCTION public.pj_conta_pagar_to_caixa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref text := 'conta_pagar:' || NEW.id::text;
BEGIN
  -- Pagamento efetivado: cria a saída no caixa (se ainda não existir)
  IF NEW.status = 'pago'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pago') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pj_caixa_transacoes WHERE referencia = ref
    ) THEN
      INSERT INTO public.pj_caixa_transacoes (
        workspace_id, tipo, descricao, valor, data,
        forma_pagamento, categoria_id, observacoes, referencia, created_by
      ) VALUES (
        NEW.workspace_id,
        'saida',
        'Pagamento: ' || NEW.descricao,
        NEW.valor,
        COALESCE(NEW.data_pagamento, CURRENT_DATE),
        NEW.forma_pagamento,
        NEW.categoria_id,
        'Baixa automática da conta a pagar',
        ref,
        COALESCE(auth.uid(), NEW.created_by)
      );
    END IF;
  END IF;

  -- Pagamento revertido: remove a saída lançada automaticamente
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'pago'
     AND NEW.status IS DISTINCT FROM 'pago' THEN
    DELETE FROM public.pj_caixa_transacoes WHERE referencia = ref;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pj_conta_pagar_to_caixa ON public.pj_contas_pagar;
CREATE TRIGGER trg_pj_conta_pagar_to_caixa
AFTER INSERT OR UPDATE OF status ON public.pj_contas_pagar
FOR EACH ROW
EXECUTE FUNCTION public.pj_conta_pagar_to_caixa();
