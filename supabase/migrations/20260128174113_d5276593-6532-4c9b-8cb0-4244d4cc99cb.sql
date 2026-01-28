-- Payment Fee Settings table
CREATE TABLE public.payment_fee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  method TEXT NOT NULL, -- 'credito', 'debito', 'pix', 'dinheiro', 'boleto'
  fee_percent NUMERIC DEFAULT 0,
  fee_fixed NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  installment_ranges JSONB, -- {"1": 2.99, "2-6": 3.49, "7-12": 4.49}
  receiving_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, method)
);

-- Enable RLS
ALTER TABLE public.payment_fee_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "fee_select" ON public.payment_fee_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "fee_insert" ON public.payment_fee_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fee_update" ON public.payment_fee_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "fee_delete" ON public.payment_fee_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_payment_fee_settings_updated_at
  BEFORE UPDATE ON public.payment_fee_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to prospects table
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS payment_methods JSONB,
ADD COLUMN IF NOT EXISTS total_fees NUMERIC DEFAULT 0;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_fee_settings;