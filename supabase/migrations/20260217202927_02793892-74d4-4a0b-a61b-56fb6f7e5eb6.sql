
-- Create user_tools table for quick access links
CREATE TABLE public.user_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_tools ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own tools" ON public.user_tools FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tools" ON public.user_tools FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tools" ON public.user_tools FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tools" ON public.user_tools FOR DELETE USING (auth.uid() = user_id);
