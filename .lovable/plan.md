

## Plano: Correcoes e Novas Formas de Pagamento com Taxas de Cartao

### Resumo dos Problemas Identificados

#### 1. PlanItemSelector - Warning de Ref
O console mostra um erro sobre "Function components cannot be given refs" no `PlanItemSelector`. Isso ocorre porque o componente nao usa `forwardRef`, mas esta sendo passado como filho para um componente que tenta passar uma ref (provavelmente o `ScrollArea`).

#### 2. CloseProspectModal - Controles nao funcionam
O usuario reporta que os selects de unidade, duracao e tipo de pagamento nao estao funcionando. Apos analise do codigo, os componentes estao estruturados corretamente com `onValueChange`, mas pode haver um problema de z-index ou conflito de eventos dentro do modal com `overflow-y-auto`.

#### 3. Criacao/Edicao de Valores no Plano
O campo de preco final ja existe no `PlanForm` e funciona. O usuario pode estar confundindo com outro cenario.

---

### Solucao Proposta

#### Parte 1: Correcao dos Problemas de Interatividade

**1.1 Corrigir PlanItemSelector com forwardRef:**
```typescript
export const PlanItemSelector = React.forwardRef<HTMLDivElement, PlanItemSelectorProps>(
  ({ pricings, selectedItems, onChange }, ref) => {
    // ... implementacao
  }
);
PlanItemSelector.displayName = 'PlanItemSelector';
```

**1.2 Corrigir z-index dos SelectContent no CloseProspectModal:**
O problema esta no `SelectContent` que pode estar sendo cortado pelo `overflow-y-auto` do DialogContent. Solucao:
- Remover `overflow-y-auto` do DialogContent principal
- Usar `ScrollArea` interno apenas no conteudo
- Garantir que os portais do Radix Select funcionem corretamente

---

#### Parte 2: Novas Formas de Pagamento

**Nova estrutura de pagamento:**

```text
Forma de Pagamento (multipla selecao):
[x] Cartao de Credito
    Bandeira: [Visa/Master/Elo/Amex] Taxa: [2.99%] Parcelas: [12]
[x] Pix
    Desconto: [5%]  (opcional)
[ ] Debito
    Taxa: [1.29%]
[ ] Dinheiro
[ ] Boleto
    Taxa: [R$ 3,50]
```

**Modelo de dados proposto:**

```typescript
// Novas interfaces
interface PaymentMethodConfig {
  id: string;
  method: 'credito' | 'debito' | 'pix' | 'dinheiro' | 'boleto';
  fee_percent?: number;      // Taxa percentual (cartoes)
  fee_fixed?: number;        // Taxa fixa (boleto)
  discount_percent?: number; // Desconto (Pix, dinheiro)
  installments?: number;     // Parcelas (credito)
  card_brand?: string;       // Bandeira (para referencia)
}

// Atualizar Prospect
interface Prospect {
  // ... campos existentes
  payment_methods?: PaymentMethodConfig[]; // JSON array
  total_fees?: number;                     // Total de taxas calculado
}
```

---

#### Parte 3: Gestao de Taxas de Cartao

**Local ideal: Financeiro > Nova aba "Taxas"**

```text
src/pages/PJ/FinanceiroPage.tsx
├── Custos
├── Precificador  
├── Categorias
└── Taxas de Pagamento   <-- NOVA ABA
```

**UI da Configuracao de Taxas:**

```text
+------------------------------------------------------------------+
| Taxas de Formas de Pagamento                                      |
+------------------------------------------------------------------+
| Configure as taxas que sua empresa paga por forma de pagamento    |
+------------------------------------------------------------------+
|                                                                  |
| CARTAO DE CREDITO                                                |
| +--------------------------------------+                         |
| | Taxa a vista:        [2.99] %        |                         |
| | Taxa parcelado (2-6x): [3.49] %      |                         |
| | Taxa parcelado (7-12x): [4.49] %     |                         |
| | Prazo de recebimento: [30] dias      |                         |
| +--------------------------------------+                         |
|                                                                  |
| CARTAO DE DEBITO                                                 |
| +--------------------------------------+                         |
| | Taxa:                [1.29] %        |                         |
| | Prazo de recebimento: [1] dia        |                         |
| +--------------------------------------+                         |
|                                                                  |
| PIX                                                              |
| +--------------------------------------+                         |
| | Taxa:                [0.00] %        |                         |
| | Desconto sugerido:   [5.00] %        |                         |
| +--------------------------------------+                         |
|                                                                  |
| BOLETO                                                           |
| +--------------------------------------+                         |
| | Taxa fixa:           R$ [3.50]       |                         |
| | Prazo de compensacao: [3] dias       |                         |
| +--------------------------------------+                         |
|                                                                  |
| [Salvar Configuracoes]                                           |
+------------------------------------------------------------------+
```

---

#### Parte 4: Integracao no Fechamento de Venda

**Novo layout do CloseProspectModal:**

```text
+------------------------------------------+
|   Confirmar Fechamento de Venda          |
+------------------------------------------+
| Cliente: Joao Silva | Empresa: XYZ       |
+------------------------------------------+
| Plano Vendido *                          |
| [Dropdown: Pacote Gold - R$ 2.000]       |
|                                          |
| Desconto (opcional)      R$ [0.00]       |
|                                          |
| VALOR BASE: R$ 2.000,00                  |
+------------------------------------------+
| FORMAS DE PAGAMENTO                      |
|                                          |
| [x] Cartao de Credito                    |
|     Valor: R$ [1.500,00]  Parcelas: [6]  |
|     Taxa: 3.49% = -R$ 52,35              |
|                                          |
| [x] Pix                                  |
|     Valor: R$ [500,00]                   |
|     Desconto: 5% = +R$ 25,00 (cliente)   |
|                                          |
| [ ] Debito   [ ] Dinheiro   [ ] Boleto   |
+------------------------------------------+
| RESUMO FINANCEIRO                        |
| Valor Bruto: R$ 2.000,00                 |
| Total Taxas: -R$ 52,35                   |
| Valor Liquido: R$ 1.947,65               |
+------------------------------------------+
| Duracao: [12] [meses v]                  |
| Tipo: [Recorrente v]                     |
+------------------------------------------+
| [x] Criar projeto automaticamente        |
| Nome: [Projeto Gold - XYZ]               |
| Prazo: [2026-02-28]                      |
+------------------------------------------+
| [Cancelar]        [Confirmar Venda] $    |
+------------------------------------------+
```

---

### Banco de Dados

**Nova tabela: payment_fee_settings**
```sql
CREATE TABLE public.payment_fee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL, -- 'credito', 'debito', 'pix', 'dinheiro', 'boleto'
  fee_percent NUMERIC DEFAULT 0,
  fee_fixed NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  installment_ranges JSONB, -- {"1": 2.99, "2-6": 3.49, "7-12": 4.49}
  receiving_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, method)
);

-- RLS policies
ALTER TABLE public.payment_fee_settings ENABLE ROW LEVEL SECURITY;
-- (policies similares as outras tabelas)
```

**Adicionar campo a prospects:**
```sql
ALTER TABLE public.prospects 
ADD COLUMN payment_methods JSONB,
ADD COLUMN total_fees NUMERIC DEFAULT 0;
```

---

### Logica de Calculo de Taxas

```typescript
const calculateFees = (
  payments: PaymentMethodConfig[],
  feeSettings: PaymentFeeSettings[]
) => {
  let totalFees = 0;
  
  payments.forEach(payment => {
    const setting = feeSettings.find(s => s.method === payment.method);
    if (!setting) return;
    
    const value = payment.value || 0;
    
    switch (payment.method) {
      case 'credito':
        // Buscar taxa baseada no numero de parcelas
        const installments = payment.installments || 1;
        const rate = getInstallmentRate(setting.installment_ranges, installments);
        totalFees += value * (rate / 100);
        break;
        
      case 'debito':
        totalFees += value * (setting.fee_percent / 100);
        break;
        
      case 'pix':
        // Pix geralmente nao tem taxa, mas pode ter
        totalFees += value * (setting.fee_percent / 100);
        break;
        
      case 'boleto':
        totalFees += setting.fee_fixed || 0;
        break;
        
      case 'dinheiro':
        // Sem taxa
        break;
    }
  });
  
  return totalFees;
};

// Valor liquido = Valor bruto - Taxas
const liquidValue = finalValue - calculateFees(paymentMethods, feeSettings);
```

---

### Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/migrations/xxx.sql` | CRIAR | Tabela payment_fee_settings + campos prospects |
| `src/types/database.ts` | MODIFICAR | Adicionar interfaces |
| `src/stores/useAppStore.ts` | MODIFICAR | Adicionar state e actions |
| `src/hooks/useInitializeData.ts` | MODIFICAR | Carregar payment settings |
| `src/components/areapj/PaymentFeeSettings.tsx` | CRIAR | Configuracao de taxas |
| `src/pages/PJ/FinanceiroPage.tsx` | MODIFICAR | Adicionar aba Taxas |
| `src/components/comercial/CloseProspectModal.tsx` | MODIFICAR | Multi-pagamento + taxas |
| `src/components/comercial/PaymentMethodSelector.tsx` | CRIAR | Seletor de formas de pgto |
| `src/components/areapj/PlanItemSelector.tsx` | MODIFICAR | Adicionar forwardRef |

---

### Fluxo de Usuario

**Configuracao (uma vez):**
1. Usuario vai em Financeiro > Taxas
2. Configura taxas de cada forma de pagamento
3. Salva configuracoes

**Uso no fechamento de venda:**
1. Usuario muda status para "Fechado"
2. Seleciona plano, aplica desconto se necessario
3. Escolhe forma(s) de pagamento
4. Para cartao: informa parcelas, sistema calcula taxa
5. Para pagamento misto: distribui valores entre formas
6. Visualiza resumo com valor liquido
7. Confirma venda

**Beneficios:**
- Precificacao precisa considerando custos de transacao
- Visibilidade do valor liquido real
- Historico de como cliente pagou
- Dados para analise de rentabilidade por forma de pagamento

---

### Ordem de Implementacao

1. **Fase 1: Correcoes**
   - Corrigir PlanItemSelector com forwardRef
   - Corrigir z-index/overflow no CloseProspectModal
   - Testar funcionamento dos controles

2. **Fase 2: Configuracao de Taxas**
   - Criar tabela payment_fee_settings
   - Criar componente PaymentFeeSettings
   - Adicionar aba em FinanceiroPage
   - Integrar com store e inicializacao

3. **Fase 3: Multi-Pagamento no Fechamento**
   - Criar PaymentMethodSelector
   - Atualizar CloseProspectModal
   - Implementar calculo de taxas
   - Atualizar prospects com dados de pagamento

4. **Fase 4: Testes**
   - Testar fluxo completo
   - Verificar calculos de taxas
   - Validar persistencia de dados

