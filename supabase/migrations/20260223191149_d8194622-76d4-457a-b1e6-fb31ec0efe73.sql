
-- Create tool_categories table
CREATE TABLE public.tool_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add category_id to user_tools
ALTER TABLE public.user_tools ADD COLUMN category_id UUID REFERENCES public.tool_categories(id) ON DELETE SET NULL;

-- RLS for tool_categories
ALTER TABLE public.tool_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tool_categories" ON public.tool_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tool_categories" ON public.tool_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tool_categories" ON public.tool_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tool_categories" ON public.tool_categories FOR DELETE USING (auth.uid() = user_id);
