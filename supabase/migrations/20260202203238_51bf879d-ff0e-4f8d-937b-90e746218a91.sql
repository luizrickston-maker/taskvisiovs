-- Allow weekly debts in debts.type
ALTER TABLE public.debts DROP CONSTRAINT IF EXISTS debts_type_check;
ALTER TABLE public.debts
  ADD CONSTRAINT debts_type_check
  CHECK (type = ANY (ARRAY['fixed'::text, 'installment'::text, 'variable'::text, 'weekly'::text]));