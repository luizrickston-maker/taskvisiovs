-- Criar tabela sales_goals
CREATE TABLE public.sales_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_type TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;

-- Policies para sales_goals
CREATE POLICY "Users can view own sales_goals" ON public.sales_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sales_goals" ON public.sales_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sales_goals" ON public.sales_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sales_goals" ON public.sales_goals FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_sales_goals_updated_at
BEFORE UPDATE ON public.sales_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela prospects
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  company_name TEXT,
  prospection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'novo',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  project_type TEXT,
  estimated_value NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Policies para prospects
CREATE POLICY "Users can view own prospects" ON public.prospects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prospects" ON public.prospects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prospects" ON public.prospects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prospects" ON public.prospects FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_prospects_updated_at
BEFORE UPDATE ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospects;