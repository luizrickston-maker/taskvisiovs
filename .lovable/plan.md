
# Plano: Adicionar Suporte a Arquivos Word (.doc/.docx)

## Resumo
Permitir upload de documentos Microsoft Word (formatos .doc e .docx) no sistema de anexos de clientes/prospects.

---

## Alterações Necessárias

### 1. Atualizar tipos de arquivo aceitos
**Arquivo:** `src/components/comercial/DocumentUploadModal.tsx`

Adicionar os MIME types do Word ao objeto `ACCEPTED_FILE_TYPES`:
- `.docx` → `application/vnd.openxmlformats-officedocument.wordprocessingml.document`  
- `.doc` → `application/msword`

### 2. Atualizar função de ícone
Adicionar lógica para exibir um ícone específico para arquivos Word (usando o ícone `FileText` já existente ou importando um mais apropriado).

### 3. Atualizar mensagens de interface
- Atualizar a mensagem de erro para incluir "Word"
- Atualizar a descrição do dropzone: "PDF, Word, Excel, JPG, PNG, WebP (máx. 10MB)"

---

## Detalhes Técnicos

```text
┌──────────────────────────────────────────────────────────┐
│              ACCEPTED_FILE_TYPES (atual)                 │
├──────────────────────────────────────────────────────────┤
│  PDF         → application/pdf                           │
│  Excel XLSX  → application/vnd.openxmlformats-...sheet  │
│  Excel XLS   → application/vnd.ms-excel                  │
│  Imagens     → image/jpeg, image/png, image/webp         │
└──────────────────────────────────────────────────────────┘
                          ↓ Após alteração
┌──────────────────────────────────────────────────────────┐
│              ACCEPTED_FILE_TYPES (novo)                  │
├──────────────────────────────────────────────────────────┤
│  PDF         → application/pdf                           │
│  Word DOCX   → application/vnd.openxmlformats-...word   │  ← NOVO
│  Word DOC    → application/msword                        │  ← NOVO
│  Excel XLSX  → application/vnd.openxmlformats-...sheet  │
│  Excel XLS   → application/vnd.ms-excel                  │
│  Imagens     → image/jpeg, image/png, image/webp         │
└──────────────────────────────────────────────────────────┘
```

### Código a ser modificado:

**Linha 14-21** - Adicionar novos MIME types:
```typescript
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};
```

**Linha 33-38** - Atualizar função `getFileIcon`:
```typescript
const getFileIcon = (file: File) => {
  if (file.type.includes('pdf')) return FileText;
  if (file.type.includes('word') || file.type.includes('msword')) return FileText;
  if (file.type.includes('spreadsheet') || file.type.includes('excel')) return FileSpreadsheet;
  if (file.type.includes('image')) return ImageIcon;
  return FileText;
};
```

**Linha 61** - Atualizar mensagem de erro:
```typescript
toast.error('Tipo de arquivo não suportado. Use PDF, Word, Excel ou imagens.');
```

**Linhas 193 e 247-248** - Atualizar textos do modal:
- Descrição: "Selecione um arquivo PDF, Word, Excel ou imagem (máx. 10MB)"
- Dropzone: "PDF, Word, Excel, JPG, PNG, WebP (máx. 10MB)"

---

## Impacto
- **Arquivos afetados:** 1 (`DocumentUploadModal.tsx`)
- **Risco:** Baixo (apenas adição de novos tipos)
- **Compatibilidade:** Total com uploads existentes
