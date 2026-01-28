-- 1. Criar bucket de storage para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('prospect-documents', 'prospect-documents', false);

-- 2. Tabela de tipos de documento customizáveis
CREATE TABLE public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

-- 3. Tabela de documentos de prospects
CREATE TABLE public.prospect_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  document_type_id UUID REFERENCES public.document_types(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prospect_documents ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies para document_types
CREATE POLICY "Users can view own document_types" ON public.document_types
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own document_types" ON public.document_types
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own document_types" ON public.document_types
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own document_types" ON public.document_types
  FOR DELETE USING (auth.uid() = user_id);

-- 5. RLS Policies para prospect_documents
CREATE POLICY "Users can view own prospect_documents" ON public.prospect_documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prospect_documents" ON public.prospect_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prospect_documents" ON public.prospect_documents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prospect_documents" ON public.prospect_documents
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Storage Policies para bucket prospect-documents
CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'prospect-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'prospect-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'prospect-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 7. Adicionar tabelas ao realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_types;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospect_documents;