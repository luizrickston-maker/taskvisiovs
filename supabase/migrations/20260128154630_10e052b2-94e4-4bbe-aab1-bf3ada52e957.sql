-- Tabela de categorias de custos empresariais
CREATE TABLE IF NOT EXISTS public.corporate_cost_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.corporate_cost_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cost_cat_select" ON corporate_cost_categories 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cost_cat_insert" ON corporate_cost_categories 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cost_cat_update" ON corporate_cost_categories 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cost_cat_delete" ON corporate_cost_categories 
  FOR DELETE USING (auth.uid() = user_id);

-- Tabela de custos operacionais
CREATE TABLE IF NOT EXISTS public.corporate_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES corporate_cost_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  cost_type TEXT NOT NULL DEFAULT 'recorrente',
  frequency TEXT DEFAULT 'mensal',
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.corporate_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "costs_select" ON corporate_costs 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "costs_insert" ON corporate_costs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "costs_update" ON corporate_costs 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "costs_delete" ON corporate_costs 
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER set_corporate_costs_updated_at
  BEFORE UPDATE ON corporate_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE corporate_cost_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE corporate_costs;