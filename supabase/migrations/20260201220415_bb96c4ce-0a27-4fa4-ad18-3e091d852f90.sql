-- 1. Create ENUM types for Editorial Calendar
CREATE TYPE public.content_status AS ENUM ('idea', 'draft', 'review', 'approved', 'published');
CREATE TYPE public.content_platform AS ENUM ('instagram', 'tiktok', 'linkedin', 'blog', 'youtube');
CREATE TYPE public.content_type_enum AS ENUM ('post', 'reel', 'story', 'article', 'video');

-- 2. Create main table: editorial_calendar_items
CREATE TABLE public.editorial_calendar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title varchar NOT NULL,
  description text,
  due_date timestamp with time zone NOT NULL,
  status public.content_status DEFAULT 'idea',
  platform public.content_platform NOT NULL,
  content_type public.content_type_enum NOT NULL,
  assigned_to uuid REFERENCES public.corporate_team(id) ON DELETE SET NULL,
  moodboard_refs jsonb DEFAULT '[]'::jsonb,
  ai_suggestions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Create indexes for query optimization
CREATE INDEX idx_editorial_calendar_user_id ON public.editorial_calendar_items(user_id);
CREATE INDEX idx_editorial_calendar_project_id ON public.editorial_calendar_items(project_id);
CREATE INDEX idx_editorial_calendar_due_date ON public.editorial_calendar_items(due_date);
CREATE INDEX idx_editorial_calendar_assigned_to ON public.editorial_calendar_items(assigned_to);
CREATE INDEX idx_editorial_calendar_status ON public.editorial_calendar_items(status);
CREATE INDEX idx_editorial_calendar_platform ON public.editorial_calendar_items(platform);

-- 4. Enable Row Level Security
ALTER TABLE public.editorial_calendar_items ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for user-scoped access
CREATE POLICY "Users can view own editorial items"
ON public.editorial_calendar_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own editorial items"
ON public.editorial_calendar_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own editorial items"
ON public.editorial_calendar_items
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own editorial items"
ON public.editorial_calendar_items
FOR DELETE
USING (auth.uid() = user_id);

-- 6. Create trigger for automatic updated_at
CREATE TRIGGER update_editorial_calendar_items_updated_at
BEFORE UPDATE ON public.editorial_calendar_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Enable Realtime for real-time collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.editorial_calendar_items;