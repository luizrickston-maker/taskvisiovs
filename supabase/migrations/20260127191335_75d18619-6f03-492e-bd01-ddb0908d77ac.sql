-- =============================================
-- MÓDULO ÁREA PJ - Tabelas para Gestão Corporativa
-- =============================================

-- Tabela 1: corporate_pricing (Precificador Inteligente)
CREATE TABLE public.corporate_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  margin_percent NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  real_margin NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para corporate_pricing
ALTER TABLE public.corporate_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pricing" 
  ON public.corporate_pricing FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pricing" 
  ON public.corporate_pricing FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pricing" 
  ON public.corporate_pricing FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pricing" 
  ON public.corporate_pricing FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_corporate_pricing_updated_at
  BEFORE UPDATE ON public.corporate_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela 2: corporate_investments (Gestão de Investimentos)
CREATE TABLE public.corporate_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'equipamento',
  amount NUMERIC NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para corporate_investments
ALTER TABLE public.corporate_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investments" 
  ON public.corporate_investments FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investments" 
  ON public.corporate_investments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investments" 
  ON public.corporate_investments FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investments" 
  ON public.corporate_investments FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_corporate_investments_updated_at
  BEFORE UPDATE ON public.corporate_investments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela 3: corporate_team (Gestão de Time/Colaboradores)
CREATE TABLE public.corporate_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'pj',
  cost NUMERIC NOT NULL DEFAULT 0,
  payment_day INTEGER NOT NULL DEFAULT 5,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para corporate_team
ALTER TABLE public.corporate_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own team" 
  ON public.corporate_team FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own team" 
  ON public.corporate_team FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own team" 
  ON public.corporate_team FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own team" 
  ON public.corporate_team FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_corporate_team_updated_at
  BEFORE UPDATE ON public.corporate_team
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar Realtime para as 3 tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.corporate_pricing;
ALTER PUBLICATION supabase_realtime ADD TABLE public.corporate_investments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.corporate_team;