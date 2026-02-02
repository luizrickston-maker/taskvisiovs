-- Create purchase_plans table for purchase planning module
CREATE TABLE public.purchase_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC NOT NULL,
  saved_amount NUMERIC DEFAULT 0,
  deadline DATE,
  priority TEXT DEFAULT 'medium',
  category TEXT,
  status TEXT DEFAULT 'planning',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.purchase_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user access
CREATE POLICY "Users can view own purchase_plans"
ON public.purchase_plans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchase_plans"
ON public.purchase_plans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchase_plans"
ON public.purchase_plans
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own purchase_plans"
ON public.purchase_plans
FOR DELETE
USING (auth.uid() = user_id);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_plans;