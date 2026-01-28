

## Plano: Correção de Interatividade do Modal de Fechamento de Venda

### Diagnóstico

Após testes automatizados extensivos no browser, constatei que **os controles do modal estão funcionando tecnicamente**, mas podem haver problemas de UX em dispositivos móveis reais. Os problemas potenciais identificados são:

1. **ScrollArea dentro de DialogContent sem altura fixa definida** - O `ScrollArea` tem `className="flex-1"` mas não tem altura definida, o que pode causar problemas de scroll e clipping de elementos em portais (como dropdowns do Radix)

2. **Estrutura do DialogContent com `p-0`** - A remoção do padding padrão pode afetar a área de toque dos elementos internos

3. **Dropdowns podem ser clicados através do ScrollArea** - O viewport do ScrollArea pode estar interceptando eventos de clique em alguns navegadores/dispositivos

4. **PaymentMethodSelector não aparece para planos com valor R$ 0,00** - Isso é comportamento esperado (condição `{finalValue > 0 && ...}`), mas pode confundir o usuário se o plano não tem preço configurado

---

### Correções a Implementar

#### 1. Melhorar estrutura do DialogContent e ScrollArea

**Problema**: O `flex-col` com `overflow-hidden` no `DialogContent` combinado com `flex-1` no `ScrollArea` pode não calcular corretamente a altura em todos os dispositivos.

**Solução**: Usar altura fixa máxima no ScrollArea e garantir que os portais dos Select funcionem corretamente:

```tsx
// Antes
<DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col p-0">
  <DialogHeader className="p-4 pb-0">...</DialogHeader>
  <ScrollArea className="flex-1 px-4 pb-4">
    ...
  </ScrollArea>
  <div className="flex gap-2 p-4 pt-2 border-t">...</div>
</DialogContent>

// Depois
<DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col p-0 overflow-visible">
  <DialogHeader className="p-4 pb-2 shrink-0">...</DialogHeader>
  <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
    <div className="space-y-4">
      ...
    </div>
  </div>
  <div className="flex gap-2 p-4 pt-2 border-t shrink-0">...</div>
</DialogContent>
```

#### 2. Adicionar z-index explícito aos SelectContent aninhados

**Problema**: Os dropdowns podem estar renderizando atrás do modal ou sendo clipados.

**Solução**: Garantir z-index alto em todos os `SelectContent`:

```tsx
<SelectContent className="z-[200]">
  {/* Já está assim, mas verificar todos */}
</SelectContent>
```

#### 3. Prevenir propagação de eventos no PaymentMethodSelector

**Problema**: Os cliques dentro dos cards do `PaymentMethodSelector` podem estar sendo interceptados.

**Solução**: Adicionar `stopPropagation` mais abrangente:

```tsx
<Card 
  key={method} 
  className={`cursor-pointer transition-colors ${selected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'}`}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    handleToggle(method, !selected);
  }}
>
```

#### 4. Adicionar portal container explícito para os Selects

**Problema**: Os portais do Radix podem estar renderizando em lugares inesperados.

**Solução**: Usar `container` prop nos `SelectContent` para garantir renderização correta.

---

### Arquivos a Modificar

| Arquivo | Alterações |
|---------|-----------|
| `src/components/comercial/CloseProspectModal.tsx` | Reestruturar DialogContent, remover ScrollArea, usar div com overflow-y-auto, adicionar shrink-0 no header/footer |
| `src/components/comercial/PaymentMethodSelector.tsx` | Melhorar event handling, adicionar z-index alto no SelectContent do cartão de crédito |

---

### Mudanças Específicas no CloseProspectModal.tsx

```tsx
// Linha 215: Alterar DialogContent
<DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col p-0">

// Para:
<DialogContent className="w-[95vw] max-w-lg max-h-[85vh] flex flex-col p-0">

// Linha 226: Remover ScrollArea e usar div com overflow-y-auto
// De:
<ScrollArea className="flex-1 px-4 pb-4">
  <div className="space-y-4">
    ...
  </div>
</ScrollArea>

// Para:
<div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
  <div className="space-y-4 pb-2">
    ...
  </div>
</div>
```

---

### Mudanças no PaymentMethodSelector.tsx

```tsx
// Linha 171: Adicionar z-index alto no SelectContent do cartão de crédito
<SelectContent className="z-[300]">
  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
    <SelectItem key={n} value={String(n)}>
      {n}x {n === 1 ? '(à vista)' : ''}
    </SelectItem>
  ))}
</SelectContent>
```

---

### Testes a Realizar

1. **Testar no mobile real**: Abrir o modal em dispositivo móvel físico
2. **Testar todos os dropdowns**: Plano, Tipo de Contrato, Unidade
3. **Testar checkbox**: Criar projeto automaticamente
4. **Testar com plano com valor > 0**: Para ver as formas de pagamento
5. **Testar confirmação**: Verificar se o som toca e os dados são salvos

---

### Resultado Esperado

- Dropdowns funcionam corretamente em todos os dispositivos
- Checkbox de criar projeto funciona sem problemas
- Formas de pagamento aparecem quando plano tem valor > 0
- Modal tem scroll suave e controles responsivos
- Confirmação de venda com feedback sonoro funcionando

