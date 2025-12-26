-- Add payment fields to prospects table
ALTER TABLE public.prospects 
ADD COLUMN payment_type TEXT DEFAULT NULL,
ADD COLUMN contract_duration INTEGER DEFAULT NULL,
ADD COLUMN payment_installments INTEGER DEFAULT NULL;

-- Add check constraint for payment_type values
ALTER TABLE public.prospects 
ADD CONSTRAINT prospects_payment_type_check 
CHECK (payment_type IS NULL OR payment_type IN ('recorrente', 'pontual'));