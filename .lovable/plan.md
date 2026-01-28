

## Diagnóstico: Upload de Documento Trava a Tela

### Problema Identificado

Ao fazer upload de documento no `DocumentUploadModal`, a barra de progresso não aparece e a tela inteira trava, impedindo fechar ou cancelar. Porém, após recarregar, o documento está anexado corretamente.

---

### Causas Raiz

#### 1. Diálogos Aninhados com Sobreposição de Overlays

A estrutura atual cria múltiplos diálogos aninhados:

```text
ProspectDetailModal (Dialog 1)
  └── ProspectDocuments
        └── DocumentUploadModal (Dialog 2)
              └── (Potencialmente) DocumentTypeManager (Dialog 3)
```

Cada `Dialog` do Radix UI renderiza seu próprio overlay (`bg-black/80`), causando:
- Múltiplos overlays empilhados (tela fica muito escura)
- Conflitos de foco e eventos entre modais
- O overlay do modal de upload bloqueia interações com o modal pai

#### 2. Problema no Controle de Estado Durante Upload

No `DocumentUploadModal.tsx`, durante o upload:
- O estado `uploading` é `true`
- O botão "Cancelar" fica `disabled={uploading}` (linha 283)
- O Dialog pode estar bloqueando o fechamento por causa do overlay

#### 3. Renderização Condicional da Barra de Progresso

A barra de progresso só é renderizada quando `uploading` é `true` (linha 272-279):
```tsx
{uploading && (
  <div className="space-y-2">
    <Progress value={uploadProgress} />
    ...
  </div>
)}
```

Se por algum motivo o estado `uploading` não estiver sendo atualizado corretamente antes do upload iniciar, a barra não aparece.

---

### Plano de Correção

#### Correção 1: Usar Modal em vez de Dialog para o Upload

Modificar `DocumentUploadModal.tsx` para usar um `Sheet` (drawer lateral) ou adicionar a prop `modal={false}` no Dialog para evitar conflitos de overlay.

**Solução recomendada:** Usar o padrão de "controlled portal" - renderizar o modal de upload fora do modal de detalhes usando um portal customizado.

#### Correção 2: Desabilitar Interatividade no Overlay do Modal de Upload

No `DocumentUploadModal`, usar `onInteractOutside` para prevenir fechamento acidental durante upload, mas ainda permitir que o usuário veja a barra de progresso.

#### Correção 3: Garantir Atualização de Estado Antes do Upload

Forçar um re-render antes de iniciar o upload para garantir que a barra apareça:

```tsx
const handleUpload = async () => {
  if (!selectedFile || !user) return;

  // Forçar estado de upload antes de começar
  setUploading(true);
  setUploadProgress(0);
  
  // Pequeno delay para garantir que o React renderize
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // ... resto do upload
};
```

#### Correção 4: Mover Modal de Upload para Fora da Hierarquia de Diálogos

Elevar o estado `uploadModalOpen` e o componente `DocumentUploadModal` para o `ComercialDashboard.tsx` ou `ProspectDetailModal.tsx`, fora da árvore de componentes do primeiro modal.

---

### Implementação Detalhada

#### Arquivo 1: `src/components/comercial/DocumentUploadModal.tsx`

Modificações:
1. Adicionar `DialogDescription` para corrigir warning de acessibilidade
2. Adicionar delay mínimo antes de iniciar upload para garantir renderização
3. Usar `onOpenChange` com verificação de estado de upload
4. Adicionar `onInteractOutside` para prevenir fechamento durante upload

```tsx
// Adicionar import
import { DialogDescription } from '@/components/ui/dialog';

// No DialogContent, adicionar onInteractOutside
<DialogContent 
  className="sm:max-w-md"
  onInteractOutside={(e) => {
    if (uploading) {
      e.preventDefault();
    }
  }}
  onEscapeKeyDown={(e) => {
    if (uploading) {
      e.preventDefault();
    }
  }}
>
  <DialogHeader>
    <DialogTitle>Anexar Documento</DialogTitle>
    <DialogDescription>
      Selecione um arquivo PDF, Excel ou imagem (máx. 10MB)
    </DialogDescription>
  </DialogHeader>
  ...
</DialogContent>

// Na função handleUpload, adicionar delay
const handleUpload = async () => {
  if (!selectedFile || !user) return;

  setUploading(true);
  setUploadProgress(0);
  
  // Garantir que o React renderize o estado de loading
  await new Promise(resolve => setTimeout(resolve, 0));
  
  try {
    // ... resto do código
  }
};
```

#### Arquivo 2: `src/components/comercial/ProspectDocuments.tsx`

Modificações:
1. Elevar o modal de upload para usar portal separado
2. Passar callback para atualizar lista após upload

#### Arquivo 3: `src/components/comercial/ProspectDetailModal.tsx`

Modificações:
1. Adicionar `DialogDescription` para corrigir warning de acessibilidade
2. Gerenciar estado do upload modal no nível deste componente

---

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `DocumentUploadModal.tsx` | Adicionar DialogDescription, onInteractOutside, delay no upload |
| `ProspectDetailModal.tsx` | Adicionar DialogDescription |
| `DocumentTypeManager.tsx` | Adicionar DialogDescription |

---

### Resultado Esperado

Após as correções:
1. A barra de progresso aparecerá durante o upload
2. O usuário não poderá fechar acidentalmente o modal durante upload
3. Os warnings de acessibilidade serão corrigidos
4. A tela não travará mais durante o upload
5. O botão "Cancelar" ficará desabilitado apenas durante o upload (comportamento atual mantido)

