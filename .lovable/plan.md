
## Plano: Corrigir Visibilidade do Modal de Criação de Plano

### Problema Identificado

O modal de criação de plano (`PlanForm.tsx`) não exibe todo o conteúdo corretamente devido a problemas de layout com o componente `ScrollArea` da Radix UI.

**Causas técnicas:**
1. O `ScrollArea` usa `flex-1` mas não tem altura explícita definida
2. A estrutura flex aninhada (`DialogContent > form > ScrollArea`) dificulta o cálculo automático de altura
3. O `ScrollAreaPrimitive.Viewport` tem `h-full` mas depende de um container com altura definida

### Solução

Aplicar a mesma correção usada no `CloseProspectModal`: substituir o `ScrollArea` por uma `div` com `overflow-y-auto` e estrutura flex correta.

---

### Mudanças no PlanForm.tsx

#### Estrutura Atual (com problema):
```tsx
<DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col p-0">
  <DialogHeader className="p-6 pb-0">...</DialogHeader>
  <form className="flex flex-col flex-1 overflow-hidden">
    <ScrollArea className="flex-1 px-6">
      <div className="space-y-6 py-4">...</div>
    </ScrollArea>
    <div className="flex justify-end gap-2 p-6 pt-4 border-t">...</div>
  </form>
</DialogContent>
```

#### Estrutura Corrigida:
```tsx
<DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col p-0">
  <DialogHeader className="p-6 pb-2 shrink-0">...</DialogHeader>
  <form className="flex flex-col flex-1 min-h-0">
    <div className="flex-1 min-h-0 overflow-y-auto px-6">
      <div className="space-y-6 py-4 pb-6">...</div>
    </div>
    <div className="flex justify-end gap-2 p-6 pt-4 border-t shrink-0">...</div>
  </form>
</DialogContent>
```

---

### Alterações Específicas

| Linha | Alteração |
|-------|-----------|
| 241 | Alterar `max-h-[90vh]` para `max-h-[85vh]` |
| 242 | Adicionar `shrink-0` ao `DialogHeader` e alterar `pb-0` para `pb-2` |
| 248 | Remover `overflow-hidden` e adicionar `min-h-0` no form |
| 249 | Substituir `ScrollArea` por `div` com `flex-1 min-h-0 overflow-y-auto` |
| 250 | Adicionar `pb-6` ao container interno para espaçamento correto |
| 408 | Adicionar `shrink-0` ao footer de botões |

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/areapj/PlanForm.tsx` | Reestruturar layout do modal substituindo ScrollArea por div com overflow-y-auto |

---

### Motivo Técnico

O `ScrollArea` da Radix UI cria um viewport interno que precisa de altura explícita para funcionar. Em layouts flex aninhados sem altura fixa, o componente pode falhar em calcular sua área de scroll, resultando em conteúdo cortado ou invisível.

A solução usando `div` com `overflow-y-auto` combinada com `flex-1 min-h-0` permite que o CSS nativo calcule corretamente a altura disponível e habilite o scroll quando necessário.

---

### Resultado Esperado

- Modal exibe todo o conteúdo corretamente
- Scroll funciona suavemente em desktop e mobile
- Dropdowns (Nível, Tipo) funcionam sem serem cortados
- Campo de preço final sempre visível
- Botões de ação sempre visíveis na parte inferior
