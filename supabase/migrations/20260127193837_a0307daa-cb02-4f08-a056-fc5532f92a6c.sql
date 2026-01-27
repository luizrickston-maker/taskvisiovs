-- Tabela de Planos/Pacotes de Serviços
CREATE TABLE public.service_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL DEFAULT 'bronze',
  plan_type TEXT NOT NULL DEFAULT 'recorrente',
  base_cost NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  profit_margin NUMERIC NOT NULL DEFAULT 0,
  monthly_limit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para service_plans
ALTER TABLE public.service_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own plans" ON public.service_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON public.service_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON public.service_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON public.service_plans FOR DELETE USING (auth.uid() = user_id);

-- Trigger updated_at para service_plans
CREATE TRIGGER update_service_plans_updated_at
  BEFORE UPDATE ON public.service_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de Itens do Plano (relacionamento Many-to-Many)
CREATE TABLE public.service_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.service_plans(id) ON DELETE CASCADE,
  pricing_id UUID NOT NULL REFERENCES public.corporate_pricing(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  custom_price NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para service_plan_items
ALTER TABLE public.service_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own plan items" ON public.service_plan_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plan items" ON public.service_plan_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plan items" ON public.service_plan_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plan items" ON public.service_plan_items FOR DELETE USING (auth.uid() = user_id);

-- Habilitar Realtime para ambas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_plan_items;