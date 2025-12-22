-- Adicionar coluna cor na tabela time_blocks
ALTER TABLE public.time_blocks ADD COLUMN IF NOT EXISTS color text DEFAULT '#6366f1';

-- Criar tabela para tipos de compromisso personalizados
CREATE TABLE IF NOT EXISTS public.time_block_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.time_block_types ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own time_block_types" ON public.time_block_types 
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own time_block_types" ON public.time_block_types 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own time_block_types" ON public.time_block_types 
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own time_block_types" ON public.time_block_types 
  FOR DELETE USING (auth.uid() = user_id);