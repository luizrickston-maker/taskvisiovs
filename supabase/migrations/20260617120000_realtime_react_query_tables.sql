-- Habilita Supabase Realtime para as tabelas usadas pelas telas em React Query
-- (Caixa PJ, Briefings, Processos, Clientes/Portal, Agenda PJ, etc.).
--
-- Sem estar na publicação `supabase_realtime`, INSERT/UPDATE/DELETE nessas
-- tabelas NÃO geram eventos de realtime, e as telas só atualizam ao recarregar
-- a página. Esta migration fecha essa lacuna para que dados criados em um
-- aparelho (inclusive pela IA) apareçam ao vivo em PC, celular e iPad.
--
-- Idempotente: ignora tabelas já presentes na publicação ou inexistentes.

DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    -- Caixa PJ
    'pj_caixa_transacoes', 'pj_caixa_categorias', 'pj_contas_pagar',
    -- Briefings
    'briefings', 'video_editing_briefings',
    -- Calendário editorial (telas internas + portal)
    'editorial_calendar_items', 'editorial_comments',
    -- Processos / canvas
    'business_processes', 'process_instances', 'process_steps', 'process_connections',
    -- Agenda PJ
    'time_blocks',
    -- Tarefas de projeto
    'project_tasks',
    -- Clientes e portal
    'clients', 'client_users', 'client_contents', 'client_video_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- REPLICA IDENTITY FULL: garante payload completo (inclui valores antigos)
      -- em UPDATE/DELETE, necessário para o realtime funcionar de forma confiável.
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);

      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        RAISE NOTICE 'Realtime habilitado: %', tbl;
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'Já na publication: %', tbl;
        WHEN OTHERS THEN
          RAISE NOTICE 'Erro em %: %', tbl, SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'Tabela não existe (skip): %', tbl;
    END IF;
  END LOOP;
END;
$$;
