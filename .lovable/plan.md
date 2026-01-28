

## Plano: Melhorias no Modal de Fechamento de Venda

### Resumo das Alteracoes

Modificar o `CloseProspectModal.tsx` para:

1. **Substituir "Valor da Venda" por "Desconto" (opcional)**
   - Campo opcional abaixo do plano vendido
   - Valor final = `plan.final_price - desconto`
   - Exibir valor final calculado em tempo real

2. **Adicionar unidades de duracao selecionaveis**
   - Opcoes: meses, horas, dias
   - Aplicavel para consultorias e mentorias
   - Layout em grid: [Duracao] [Unidade]

3. **Tocar som de dinheiro ao confirmar venda**
   - Usar HTML5 Audio API
   - Arquivo de som hospedado em URL publica (royalty-free)
   - Tocar antes de exibir toast de sucesso

---

### Interface Visual Atualizada

```text
+------------------------------------------+
|   Confirmar Fechamento de Venda          |
+------------------------------------------+
| Cliente: Joao Silva                      |
| Empresa: XYZ Ltda                        |
+------------------------------------------+
|                                          |
| Plano Vendido *                          |
| [Dropdown: Consultoria Gold - R$ 500]    |
|                                          |
| Desconto (opcional)         R$           |
| [100.00]                                 |
|                                          |
| Valor Final: R$ 400,00     <-- calculado |
|                                          |
+------------------------------------------+
| Tipo de Pagamento       | Duracao        |
| [Recorrente v]          | [12] [meses v] |
|                         |                |
|                         | [4] [horas v]  | <- para consultorias
+------------------------------------------+
|                                          |
| [x] Criar projeto automaticamente        |
| ...                                      |
+------------------------------------------+
| [Cancelar]        [Confirmar Venda] $$$  |
+------------------------------------------+
```

---

### Detalhes Tecnicos

#### 1. Substituir Valor por Desconto

**Remover:**
```typescript
const [estimatedValue, setEstimatedValue] = useState('');
```

**Adicionar:**
```typescript
const [discount, setDiscount] = useState('0');

// Calcular valor final
const selectedPlan = activePlans.find(p => p.id === planId);
const planPrice = selectedPlan?.final_price || 0;
const discountValue = parseFloat(discount) || 0;
const finalValue = Math.max(0, planPrice - discountValue);
```

**UI:**
```tsx
{/* Desconto Opcional */}
<div className="space-y-2">
  <Label htmlFor="discount" className="flex items-center gap-1">
    <Percent className="w-4 h-4" />
    Desconto (opcional)
  </Label>
  <Input
    id="discount"
    type="number"
    step="0.01"
    min="0"
    value={discount}
    onChange={(e) => setDiscount(e.target.value)}
    placeholder="0.00"
  />
</div>

{/* Valor Final Calculado */}
{planId && (
  <div className="bg-success/10 border border-success/20 rounded-lg p-3">
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">Valor Final:</span>
      <span className="text-lg font-bold text-success">
        {formatCurrency(finalValue)}
      </span>
    </div>
  </div>
)}
```

#### 2. Unidades de Duracao Selecionaveis

**Novo estado:**
```typescript
type DurationUnit = 'meses' | 'horas' | 'dias';
const [durationUnit, setDurationUnit] = useState<DurationUnit>('meses');
```

**UI Grid:**
```tsx
{paymentType === 'recorrente' && (
  <div className="grid grid-cols-2 gap-2">
    <div className="space-y-2">
      <Label htmlFor="duration">Duracao</Label>
      <Input
        id="duration"
        type="number"
        min="1"
        value={contractDuration}
        onChange={(e) => setContractDuration(e.target.value)}
      />
    </div>
    <div className="space-y-2">
      <Label>Unidade</Label>
      <Select value={durationUnit} onValueChange={(v) => setDurationUnit(v as DurationUnit)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="meses">Meses</SelectItem>
          <SelectItem value="horas">Horas</SelectItem>
          <SelectItem value="dias">Dias</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
)}
```

**Nota sobre banco de dados:**
- O campo `contract_duration` ja e um numero inteiro
- A unidade pode ser armazenada como parte das `notes` ou criado novo campo
- Para MVP: armazenar no formato "12 meses" ou "4 horas" nas notes

#### 3. Som de Dinheiro ao Confirmar

**Implementacao com Audio API:**
```typescript
const playMoneySound = () => {
  // URL de som royalty-free de caixa registradora/dinheiro
  const audio = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_942bb987c4.mp3');
  audio.volume = 0.5;
  audio.play().catch(() => {
    // Silenciosamente ignora se autoplay bloqueado
  });
};

const handleConfirm = async () => {
  // ... validacoes ...
  
  try {
    // ... salvar dados ...
    
    // Tocar som de sucesso
    playMoneySound();
    
    toast.success(...);
  } catch (error) {
    // ... erro ...
  }
};
```

**Alternativa com arquivo local:**
- Adicionar `public/sounds/cash-register.mp3`
- Usar `new Audio('/sounds/cash-register.mp3')`

---

### Validacao Atualizada

```typescript
const handleConfirm = async () => {
  if (!prospect || !user?.id) return;
  
  if (!planId) {
    toast.error('Selecione um plano vendido');
    return;
  }
  
  // Valor vem do plano - desconto (sempre positivo)
  if (finalValue <= 0) {
    toast.error('O desconto nao pode ser maior que o valor do plano');
    return;
  }

  // ... resto da logica ...
  
  const prospectUpdate: Partial<Prospect> = {
    status: 'fechado',
    plan_id: planId,
    estimated_value: finalValue, // Valor final apos desconto
    payment_type: paymentType,
    contract_duration: paymentType === 'recorrente' ? parseInt(contractDuration) || null : null,
    payment_installments: paymentType === 'pontual' ? parseInt(paymentInstallments) || null : null,
    notes: durationUnit !== 'meses' 
      ? `Duracao: ${contractDuration} ${durationUnit}` 
      : prospect.notes,
  };
};
```

---

### Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|------------|
| `src/components/comercial/CloseProspectModal.tsx` | Todas as mudancas descritas |
| `public/sounds/cash-register.mp3` | Opcional - arquivo de audio local |

---

### Resumo das Mudancas no Estado

| Antes | Depois |
|-------|--------|
| `estimatedValue` | `discount` |
| - | `durationUnit` |
| - | `finalValue` (calculado) |

---

### Experiencia do Usuario

1. **Seleciona plano** -> Valor do plano aparece
2. **Aplica desconto** (opcional) -> Valor final atualiza em tempo real
3. **Escolhe duracao e unidade** -> Flexivel para consultorias/mentorias
4. **Confirma venda** -> Som de dinheiro toca + toast de sucesso

