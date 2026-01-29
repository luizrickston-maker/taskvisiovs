

## Plano: Permitir Entrada de Tempo no Formato H:MM no Precificador

### Problema Atual

O campo "Horas Estimadas" usa `type="number"` que só aceita valores decimais (ex: `1.5`). O usuário quer poder digitar no formato mais intuitivo `H:MM` (ex: `1:30` para 1 hora e 30 minutos).

### Solução

Modificar o campo de entrada para aceitar formato de tempo `H:MM` e converter automaticamente para horas decimais nos cálculos.

---

### Mudanças no PricingCalculator.tsx

#### 1. Alterar o tipo do Input de `number` para `text`

```tsx
// Antes
<Input
  id="estimatedHours"
  type="number"
  step="0.5"
  placeholder="0"
  value={estimatedHours}
  onChange={(e) => setEstimatedHours(e.target.value)}
/>

// Depois
<Input
  id="estimatedHours"
  type="text"
  placeholder="1:30"
  value={estimatedHours}
  onChange={(e) => setEstimatedHours(e.target.value)}
/>
```

#### 2. Criar função para converter "H:MM" para horas decimais

```tsx
// Função helper para parsear tempo
const parseTimeToHours = (timeStr: string): number => {
  if (!timeStr || timeStr.trim() === '') return 0;
  
  // Se contém ":", parse como H:MM
  if (timeStr.includes(':')) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const h = isNaN(hours) ? 0 : hours;
    const m = isNaN(minutes) ? 0 : minutes;
    return h + (m / 60);
  }
  
  // Senão, tenta parsear como número decimal
  const parsed = parseFloat(timeStr.replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
};
```

#### 3. Atualizar o cálculo para usar a função

```tsx
// No useMemo de calculations
const hours = parseTimeToHours(estimatedHours);
```

#### 4. Função para formatar horas decimais de volta para exibição

```tsx
// Para exibir no breakdown de custos
const formatHoursDisplay = (timeStr: string): string => {
  const hours = parseTimeToHours(timeStr);
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}min`;
};
```

#### 5. Atualizar tooltip explicativo

```tsx
<TooltipContent>
  <p className="max-w-xs text-sm">
    Tempo necessário para executar o serviço.
    Use formato H:MM (ex: 1:30) ou decimal (ex: 1.5).
  </p>
</TooltipContent>
```

#### 6. Atualizar exibição do custo operacional

```tsx
// Linha 305-308 - mostrar tempo formatado
{useOperationalCost && parseTimeToHours(estimatedHours) > 0 && (
  <p className="text-sm text-muted-foreground">
    + {formatCurrency(calculations.operationalCost)} ({formatHoursDisplay(estimatedHours)} × {formatCurrency(operationalData.costPerHour)}/h)
  </p>
)}
```

---

### Arquivo a Modificar

| Arquivo | Alterações |
|---------|-----------|
| `src/components/areapj/PricingCalculator.tsx` | Criar funções de parse/format, alterar input para text, atualizar tooltip |

---

### Exemplos de Entrada Aceitos

| Entrada | Horas Decimais |
|---------|----------------|
| `1:30` | 1.5 |
| `2:00` | 2.0 |
| `0:45` | 0.75 |
| `3:15` | 3.25 |
| `1.5` | 1.5 |
| `2` | 2.0 |

---

### Resultado Esperado

- Campo aceita formato `H:MM` (ex: `1:30`, `2:45`)
- Também aceita formato decimal (ex: `1.5`, `2.75`) para retrocompatibilidade
- Tooltip explica os dois formatos aceitos
- Exibição mostra tempo formatado (ex: "1h30min × R$ 50,00/h")
- Cálculos funcionam corretamente com ambos os formatos

