

## Plano: Input de Horas com Formatacao Automatica Estilo Relogio

### Problema Atual

O campo de "Horas Estimadas" aceita qualquer texto sem validacao ou formatacao. O usuario pode digitar "1222" que nao faz sentido como formato de tempo. E necessario:
1. Formatar automaticamente enquanto digita (como um relogio)
2. Limitar minutos ao maximo de 59
3. Limitar horas a um valor razoavel (ex: maximo 999 horas)
4. Inserir automaticamente o ":" apos as horas

### Solucao

Criar uma funcao de formatacao que aplica mascara de tempo conforme o usuario digita.

---

### Mudancas no PricingCalculator.tsx

#### 1. Criar funcao de formatacao de input

```tsx
// Formata input como tempo H:MM enquanto digita
const formatTimeInput = (value: string): string => {
  // Remove tudo que nao for digito
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  
  // Se tiver 1-2 digitos, sao as horas
  if (digits.length <= 2) {
    return digits;
  }
  
  // Se tiver 3+ digitos, separa horas e minutos
  const hours = digits.slice(0, -2);
  let minutes = digits.slice(-2);
  
  // Limita minutos a 59
  if (parseInt(minutes) > 59) {
    minutes = '59';
  }
  
  // Limita horas a 999
  const hoursNum = parseInt(hours);
  const limitedHours = hoursNum > 999 ? '999' : hours;
  
  return `${limitedHours}:${minutes}`;
};
```

#### 2. Atualizar o onChange do Input

```tsx
<Input
  id="estimatedHours"
  type="text"
  placeholder="1:30"
  value={estimatedHours}
  onChange={(e) => setEstimatedHours(formatTimeInput(e.target.value))}
  maxLength={6} // 999:59
/>
```

#### 3. Atualizar a funcao parseTimeToHours

A funcao existente ja lida com o formato "H:MM", mas podemos melhorar para aceitar entrada parcial:

```tsx
const parseTimeToHours = (timeStr: string): number => {
  if (!timeStr || timeStr.trim() === '') return 0;
  
  // Se contem ":", parse como H:MM
  if (timeStr.includes(':')) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const h = isNaN(hours) ? 0 : hours;
    const m = isNaN(minutes) ? 0 : Math.min(minutes, 59);
    return h + (m / 60);
  }
  
  // Se for somente digitos (durante digitacao), trata como horas
  if (/^\d+$/.test(timeStr)) {
    return parseFloat(timeStr) || 0;
  }
  
  // Fallback para decimal com virgula
  const parsed = parseFloat(timeStr.replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
};
```

---

### Comportamento Esperado

| Usuario Digita | Campo Exibe | Horas Decimais |
|----------------|-------------|----------------|
| `1` | `1` | 1.0 |
| `13` | `13` | 13.0 |
| `130` | `1:30` | 1.5 |
| `1300` | `13:00` | 13.0 |
| `245` | `2:45` | 2.75 |
| `12345` | `123:45` | 123.75 |
| `99999` | `999:59` | 999.98 |

---

### Arquivo a Modificar

| Arquivo | Alteracoes |
|---------|-----------|
| `src/components/areapj/PricingCalculator.tsx` | Adicionar `formatTimeInput`, atualizar onChange do input, adicionar maxLength |

---

### Resultado Esperado

- Input formata automaticamente para H:MM enquanto usuario digita
- Minutos limitados a 59 (nao aceita 1:75 por exemplo)
- Horas limitadas a 999 (valor razoavel para servicos)
- Caracteres nao-numericos sao ignorados
- Experiencia similar a digitar horario em um relogio digital

