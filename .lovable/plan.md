

## Plano: Sistema de Documentos para Clientes

### Visao Geral

Implementar um sistema robusto de anexacao de documentos aos clientes (prospects), permitindo:
- Upload de arquivos PDF, Excel (.xlsx, .xls) e imagens (jpg, png, webp)
- Categorizacao por tipo de documento (customizavel pelo usuario)
- Visualizacao e gerenciamento dos documentos na tela de detalhes do cliente
- Upload opcional (nao obrigatorio)

---

### Arquitetura Proposta

```text
+------------------+       +---------------------+       +------------------+
|  document_types  |       |  prospect_documents |       |  Storage Bucket  |
+------------------+       +---------------------+       +------------------+
| id               |<------| document_type_id    |       | prospect-docs/   |
| user_id          |       | prospect_id         |------>|  {user_id}/      |
| name (checklist, |       | file_path           |       |   {prospect_id}/ |
|  contrato, etc)  |       | file_name           |       |     file.pdf     |
| color            |       | file_size           |       +------------------+
| created_at       |       | mime_type           |
+------------------+       | user_id             |
                           | created_at          |
                           +---------------------+
```

---

### Componentes da Solucao

#### 1. Backend (Database + Storage)

**Tabela `document_types`** - Tipos de documento customizaveis:
- `id` (UUID, PK)
- `user_id` (UUID, NOT NULL) - RLS por usuario
- `name` (TEXT, NOT NULL) - Ex: "Checklist", "Contrato", "Proposta"
- `color` (TEXT) - Cor do badge para identificacao visual
- `created_at` (TIMESTAMPTZ)

**Tabela `prospect_documents`** - Documentos anexados:
- `id` (UUID, PK)
- `user_id` (UUID, NOT NULL) - RLS por usuario
- `prospect_id` (UUID, FK para prospects, ON DELETE CASCADE)
- `document_type_id` (UUID, FK para document_types, nullable)
- `file_path` (TEXT, NOT NULL) - Caminho no storage
- `file_name` (TEXT, NOT NULL) - Nome original do arquivo
- `file_size` (INTEGER) - Tamanho em bytes
- `mime_type` (TEXT) - Tipo MIME do arquivo
- `notes` (TEXT) - Observacoes opcionais
- `created_at` (TIMESTAMPTZ)

**Storage Bucket `prospect-documents`**:
- Bucket privado (RLS habilitado)
- Estrutura: `{user_id}/{prospect_id}/{filename}`
- Politicas RLS para SELECT, INSERT, DELETE por usuario

---

#### 2. Frontend - Novos Componentes

| Componente | Funcao |
|------------|--------|
| `DocumentTypeManager` | CRUD de tipos de documento (Config ou modal) |
| `ProspectDocuments` | Lista de documentos de um prospect |
| `DocumentUploadModal` | Modal para upload com selecao de tipo |
| `DocumentCard` | Card individual de documento com preview/download/delete |
| `ProspectDetailModal` | Visualizacao completa do prospect com aba de documentos |

---

#### 3. Fluxo de Usuario

1. **Configurar Tipos** (opcional): 
   - Em Configuracoes ou na propria tela comercial
   - Criar tipos como "Contrato", "Checklist", "Proposta Comercial"

2. **Abrir Detalhes do Prospect**:
   - Clicar no prospect na lista
   - Ver informacoes basicas + aba/secao "Documentos"

3. **Adicionar Documento**:
   - Clicar em "Anexar Documento"
   - Selecionar arquivo (drag & drop ou click)
   - Escolher tipo de documento (opcional)
   - Adicionar notas (opcional)
   - Confirmar upload

4. **Gerenciar Documentos**:
   - Visualizar preview (imagens) ou abrir (PDF/Excel)
   - Download do arquivo
   - Excluir documento
   - Filtrar por tipo

---

### Detalhes Tecnicos

#### Tipos de Arquivo Suportados
| Tipo | MIME Types | Extensoes |
|------|------------|-----------|
| PDF | application/pdf | .pdf |
| Excel | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel | .xlsx, .xls |
| Imagens | image/jpeg, image/png, image/webp | .jpg, .jpeg, .png, .webp |

#### Limite de Tamanho
- Maximo: 10MB por arquivo
- Validacao no frontend antes do upload

#### Seguranca
- RLS em todas as tabelas (user_id = auth.uid())
- Storage com policies restritas por usuario
- URLs assinadas para download (nao publicas)

---

### Arquivos a Criar/Modificar

#### Novos Arquivos
```text
src/components/comercial/
  - ProspectDetailModal.tsx      # Modal com detalhes + documentos
  - ProspectDocuments.tsx        # Lista de documentos
  - DocumentUploadModal.tsx      # Modal de upload
  - DocumentCard.tsx             # Card de documento individual
  - DocumentTypeManager.tsx      # Gerenciador de tipos
```

#### Arquivos a Modificar
```text
src/types/database.ts            # Novos tipos
src/stores/useAppStore.ts        # Estado para document_types e prospect_documents
src/hooks/useInitializeData.ts   # Carregar document_types
src/hooks/useRealtimeSync.ts     # Sync realtime (opcional para documentos)
src/components/comercial/ProspectList.tsx  # Abrir modal de detalhes ao clicar
src/pages/ComercialDashboard.tsx # Integrar modal de detalhes
```

---

### Migracao SQL Necessaria

```sql
-- 1. Criar bucket de storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('prospect-documents', 'prospect-documents', false);

-- 2. Tabela de tipos de documento
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

-- 6. Storage Policies
CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'prospect-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'prospect-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'prospect-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

### UX/Design

#### ProspectDetailModal
- Header com nome do cliente e empresa
- Tabs: "Informacoes" | "Documentos"
- Informacoes: dados do prospect (somente leitura + botao editar)
- Documentos: grid de DocumentCards + botao upload

#### DocumentCard
- Thumbnail (imagem) ou icone (PDF/Excel)
- Nome do arquivo (truncado)
- Badge colorido do tipo de documento
- Data de upload
- Acoes: Download, Excluir

#### Upload Modal
- Dropzone com drag & drop
- Preview do arquivo selecionado
- Dropdown para tipo de documento (opcional)
- Campo de notas (textarea)
- Barra de progresso durante upload

---

### Consideracoes de Seguranca

1. **Validacao de MIME type**: Verificar no frontend E no backend
2. **Limite de tamanho**: Prevenir uploads muito grandes
3. **Sanitizacao de nomes**: Renomear arquivos com UUID para evitar conflitos
4. **URLs assinadas**: Gerar URLs temporarias para download (nao expor publicamente)
5. **RLS rigoroso**: user_id em todas as operacoes

---

### Resultado Esperado

Apos implementacao:
- Usuario pode categorizar documentos por tipo customizavel
- Upload de PDF, Excel e imagens diretamente na ficha do cliente
- Visualizacao organizada com badges coloridos por tipo
- Download e exclusao intuitivos
- Sincronizacao em tempo real entre dispositivos
- Seguranca garantida por RLS e storage policies

