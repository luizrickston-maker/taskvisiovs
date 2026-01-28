

## Plano: Permitir Definir Preço Final Diretamente no Plano

### Problema Identificado

O formulário de criação de plano (`PlanForm.tsx`) atualmente:
1. **Depende de serviços do Precificador** - Só permite adicionar itens se houver pricings cadastrados
2. **O campo "Preço Final" existe** (linha 344-350), mas está desenhado para ser usado como ajuste sobre o "Custo Base" calculado dos itens
3. **Se não houver itens cadastrados no precificador**, o usuário vê a mensagem "Nenhum serviço cadastrado no precificador" e não consegue definir um preço

### Solução Proposta

Modificar o `PlanForm.tsx` para permitir que o usuário defina um **Preço Final diretamente**, independente de ter serviços do precificador selecionados.

---

### Mudancas no PlanForm.tsx

#### 1. Tornar a secao "Servicos do Plano" opcional

Mover a mensagem informativa para dentro de um collapsible ou simplesmente mostrar que e opcional:

```tsx
{/* Service Selection - OPCIONAL */}
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-medium">Servicos do Plano (opcional)</h3>
    <span className="text-xs text-muted-foreground">
      Adicione itens do precificador ou defina o preco manualmente
    </span>
  </div>
  <PlanItemSelector
    pricings={corporatePricings}
    selectedItems={selectedItems}
    onChange={setSelectedItems}
  />
</div>
```

#### 2. Melhorar a secao de Precos

Deixar claro que o "Preco Final" pode ser digitado livremente:

```tsx
{/* Price Summary */}
<div className="space-y-4">
  <h3 className="text-sm font-medium">Precificacao</h3>
  
  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
    {/* Custo Base - so mostra se tiver itens */}
    {baseCost > 0 && (
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Custo Base (soma dos itens)</span>
        <span className="font-medium">{formatCurrency(baseCost)}</span>
      </div>
    )}

    {/* Preco Final - SEMPRE editavel */}
    <div className="space-y-2">
      <Label htmlFor="finalPrice" className="text-sm font-medium">
        Preco Final do Plano *
      </Label>
      <Input
        id="finalPrice"
        value={finalPriceInput}
        onChange={(e) => setFinalPriceInput(e.target.value)}
        placeholder="R$ 0,00"
        className="text-right font-medium text-lg"
      />
      <p className="text-xs text-muted-foreground">
        Digite o valor que sera cobrado do cliente
      </p>
    </div>

    {/* Lucro e Margem - so mostra se tiver custo base */}
    {baseCost > 0 && (
      <>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Lucro</span>
          <span className={cn('font-medium', profit >= 0 ? 'text-green-600' : 'text-destructive')}>
            {formatCurrency(profit)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Margem de Lucro</span>
          <span className={cn('font-bold text-lg', profitMargin >= 0 ? 'text-green-600' : 'text-destructive')}>
            {profitMargin.toFixed(1)}%
          </span>
        </div>
      </>
    )}
  </div>
</div>
```

#### 3. Remover auto-preenchimento que pode confundir

O useEffect que auto-preenche o preco final quando baseCost muda pode confundir. Modificar para so preencher se o campo estiver vazio E houver itens:

```tsx
// Auto-set final price to base cost ONLY if empty and items are selected
useEffect(() => {
  // Nao fazer nada se estiver editando um plano existente
  if (editingPlan) return;
  
  // Nao fazer nada se o usuario ja digitou algo
  if (finalPriceInput) return;
  
  // Só preencher automaticamente se tiver itens selecionados
  if (selectedItems.length > 0 && baseCost > 0) {
    setFinalPriceInput(formatCurrency(baseCost));
  }
}, [baseCost, editingPlan, finalPriceInput, selectedItems.length]);
```

#### 4. Adicionar validacao de preco obrigatorio

No handleSubmit, adicionar validacao:

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user || !name.trim()) return;
  
  // Validar preco final
  if (finalPrice <= 0) {
    toast({
      title: 'Preco obrigatorio',
      description: 'Defina um preco final para o plano.',
      variant: 'destructive',
    });
    return;
  }
  
  // ... resto do codigo
};
```

---

### Arquivo a Modificar

| Arquivo | Alteracoes |
|---------|-----------|
| `src/components/areapj/PlanForm.tsx` | Reorganizar UI, tornar servicos opcionais, melhorar campo de preco, adicionar validacao |

---

### Resultado Esperado

1. Usuario pode criar um plano digitando apenas **Nome** e **Preco Final**
2. A selecao de servicos do precificador e **opcional** - para quem quer ter controle de custos
3. Se servicos forem selecionados, mostra calculo de lucro e margem
4. Se nao houver servicos, mostra apenas o campo de preco final
5. Validacao impede criar plano com preco R$ 0,00

---

### Interface Visual Esperada

```text
+------------------------------------------+
| Novo Plano de Servico                    |
+------------------------------------------+
| Nome do Plano *                          |
| [Consultoria Basica]                     |
|                                          |
| Descricao                                |
| [...]                                    |
|                                          |
| Nivel: [Bronze v]  Tipo: [Recorrente v]  |
+------------------------------------------+
| Servicos do Plano (opcional)             |
| Adicione itens do precificador ou        |
| defina o preco manualmente abaixo        |
|                                          |
| [ ] Servico 1 - R$ 100,00                |
| [ ] Servico 2 - R$ 200,00                |
+------------------------------------------+
| PRECIFICACAO                             |
|                                          |
| Preco Final do Plano *                   |
| [R$ 500,00]                              |
| Digite o valor cobrado do cliente        |
|                                          |
+------------------------------------------+
| [Cancelar]              [Criar Plano]    |
+------------------------------------------+
```

