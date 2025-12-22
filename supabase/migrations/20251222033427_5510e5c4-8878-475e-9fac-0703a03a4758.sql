-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Create user_preferences table
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  app_name text NOT NULL DEFAULT 'Flow Control',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Create categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'debt')),
  color text NOT NULL DEFAULT '#6366f1',
  icon text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- Create incomes table
CREATE TABLE public.incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own incomes" ON public.incomes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own incomes" ON public.incomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own incomes" ON public.incomes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own incomes" ON public.incomes
  FOR DELETE USING (auth.uid() = user_id);

-- Create expenses table
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Create debts table
CREATE TABLE public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  due_date date NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  type text NOT NULL CHECK (type IN ('fixed', 'installment', 'variable')),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  installment_current integer,
  installment_total integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debts" ON public.debts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own debts" ON public.debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own debts" ON public.debts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own debts" ON public.debts
  FOR DELETE USING (auth.uid() = user_id);

-- Create savings table (Caixa Guardado)
CREATE TABLE public.savings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  description text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings" ON public.savings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own savings" ON public.savings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own savings" ON public.savings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own savings" ON public.savings
  FOR DELETE USING (auth.uid() = user_id);

-- Create goals table
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('financial', 'savings', 'custom')),
  amount numeric NOT NULL CHECK (amount > 0),
  deadline date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

-- Create tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  type text NOT NULL CHECK (type IN ('inbox', 'today')),
  scheduled_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Create time_blocks table
CREATE TABLE public.time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('cash', 'client', 'project')),
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time_blocks" ON public.time_blocks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own time_blocks" ON public.time_blocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own time_blocks" ON public.time_blocks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own time_blocks" ON public.time_blocks
  FOR DELETE USING (auth.uid() = user_id);

-- Create project_categories table
CREATE TABLE public.project_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project_categories" ON public.project_categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own project_categories" ON public.project_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own project_categories" ON public.project_categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own project_categories" ON public.project_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Create projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task text NOT NULL,
  project text NOT NULL,
  project_category_id uuid REFERENCES public.project_categories(id) ON DELETE CASCADE,
  priority integer NOT NULL CHECK (priority BETWEEN 1 AND 5) DEFAULT 3,
  status text NOT NULL CHECK (status IN ('todo', 'progress', 'blocked', 'done')) DEFAULT 'todo',
  estimated_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- Create scripts table
CREATE TABLE public.scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  platform text NOT NULL CHECK (platform IN ('youtube', 'youtube_shorts', 'tiktok', 'tiktok_ads', 'instagram_reels', 'instagram_post', 'instagram_boost', 'facebook_ads')),
  scheduled_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'scheduled', 'published')) DEFAULT 'draft',
  project_id uuid REFERENCES public.project_categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scripts" ON public.scripts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scripts" ON public.scripts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scripts" ON public.scripts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scripts" ON public.scripts
  FOR DELETE USING (auth.uid() = user_id);

-- Create api_keys table
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  api_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api_keys" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own api_keys" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own api_keys" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own api_keys" ON public.api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Income categories
  INSERT INTO public.categories (user_id, name, type, color, is_default) VALUES
    (NEW.id, 'Corte', 'income', '#22c55e', true),
    (NEW.id, 'AI/n8n', 'income', '#3b82f6', true),
    (NEW.id, 'Low Ticket', 'income', '#8b5cf6', true),
    (NEW.id, 'Marketing', 'income', '#f59e0b', true),
    (NEW.id, 'Outro', 'income', '#6b7280', true);
  
  -- Expense categories
  INSERT INTO public.categories (user_id, name, type, color, is_default) VALUES
    (NEW.id, 'Alimentação', 'expense', '#ef4444', true),
    (NEW.id, 'Transporte', 'expense', '#f97316', true),
    (NEW.id, 'Materiais', 'expense', '#eab308', true),
    (NEW.id, 'Outro', 'expense', '#6b7280', true);
  
  -- Debt categories
  INSERT INTO public.categories (user_id, name, type, color, is_default) VALUES
    (NEW.id, 'Cartão', 'debt', '#dc2626', true),
    (NEW.id, 'Contas', 'debt', '#ea580c', true),
    (NEW.id, 'Empréstimo', 'debt', '#d97706', true),
    (NEW.id, 'Moradia', 'debt', '#ca8a04', true),
    (NEW.id, 'Outro', 'debt', '#6b7280', true);
  
  -- Create default user preferences
  INSERT INTO public.user_preferences (user_id, app_name) VALUES (NEW.id, 'Flow Control');
  
  -- Create default user role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger to create default categories on user signup
CREATE TRIGGER on_auth_user_created_defaults
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_categories();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON public.debts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON public.scripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();