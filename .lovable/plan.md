

## Plano: Adicionar Campo "Valor Cobrado" no Precificador

### Objetivo

Adicionar um campo opcional "Valor Cobrado" que permite ao usuario informar o preco real que sera cobrado do cliente, possibilitando comparar com o preco sugerido e calcular o lucro/margem reais baseados no valor efetivamente praticado.

---

### Alteracoes no Banco de Dados

Adicionar nova coluna na tabela `corporate_pricing`:

```sql
ALTER TABLE corporate_pricing 
ADD COLUMN charged_price numeric DEFAULT NULL;
```

---

### Alteracoes no Frontend

**Arquivo: `src/components/areapj/PricingCalculator.tsx`**

#### 1. Adicionar novo estado (linha ~45)

```tsx
const [chargedPrice, setChargedPrice] = useState('');
```

#### 2. Atualizar calculo do useMemo (linhas 164-190)

Adicionar calculos baseados no valor cobrado:

```tsx
// Calculos existentes...
const chargedValue = parseFloat(chargedPrice) || 0;
const chargedProfit = chargedValue > 0 ? chargedValue - custoComImpostos : lucroLiquido;
const chargedMargin = chargedValue > 0 && chargedValue !== 0 
  ? (chargedProfit / chargedValue) * 100 
  : margemReal;
const priceDifference = chargedValue - precoFinal;

return {
  // ...campos existentes
  chargedPrice: chargedValue,
  chargedProfit,
  chargedMargin,
  priceDifference,
};
```

#### 3. Adicionar campo de input apos "Margem Desejada" (apos linha 394)

```tsx
<div className="space-y-2">
  <div className="flex items-center gap-1">
    <Label htmlFor="chargedPrice">Valor Cobrado (R$)</Label>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">
            Opcional. Informe o valor que voce realmente vai cobrar 
            para calcular o lucro e margem reais.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
  <Input
    id="chargedPrice"
    type="number"
    step="0.01"
    placeholder="0,00"
    value={chargedPrice}
    onChange={(e) => setChargedPrice(e.target.value)}
  />
</div>
```

#### 4. Atualizar cards de KPI (linhas 443-489)

Exibir informacoes baseadas no valor cobrado quando preenchido:

- Card "Preco Sugerido": mostrar tambem o valor cobrado e diferenca
- Card "Lucro Liquido": usar `chargedProfit` quando houver valor cobrado
- Card "Margem Real": usar `chargedMargin` quando houver valor cobrado

#### 5. Atualizar handleSave (linhas 200-210)

Incluir `charged_price` no objeto salvo:

```tsx
charged_price: parseFloat(chargedPrice) || null,
```

#### 6. Adicionar reset do campo (linha 231)

```tsx
setChargedPrice('');
```

#### 7. Atualizar tabela de historico (linhas 507-549)

Adicionar coluna "Valor Cobrado" na tabela desktop e nos cards mobile.

---

### Atualizacao de Tipos

**Arquivo: `src/types/database.ts`**

Adicionar campo na interface `CorporatePricing` (linha ~58):

```tsx
charged_price?: number;
```

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Adicionar coluna `charged_price` |
| `src/components/areapj/PricingCalculator.tsx` | Estado, input, calculos, KPIs, handleSave, tabela |
| `src/types/database.ts` | Adicionar `charged_price` na interface |

---

### Layout Atualizado dos Cards

Quando o campo "Valor Cobrado" for preenchido:

```text
+---------------------------+
| Preco Sugerido            |
| R$ 1.500,00               |
+---------------------------+
| Valor Cobrado             |
| R$ 1.800,00               |
| (+R$ 300,00 acima)        |  <-- indicador de diferenca
+---------------------------+
| Lucro Real                |
| R$ 800,00                 |  <-- baseado no valor cobrado
+---------------------------+
| Margem Real               |
| 44,4%                     |  <-- baseado no valor cobrado
+---------------------------+
```

---

### Resultado Esperado

- Campo "Valor Cobrado" opcional apos Margem Desejada
- Quando preenchido, mostra lucro e margem baseados no valor real
- Indicador visual da diferenca entre sugerido e cobrado
- Historico salva e exibe o valor cobrado
- Permite analise mais precisa da rentabilidade real

