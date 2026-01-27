

## Plano Completo: Novo Modulo "Area PJ"

### Visao Geral da Arquitetura

O modulo "Area PJ" sera implementado seguindo os padroes existentes do projeto:
- **Navegacao**: Adicionar item no `AppSidebar.tsx` e `MobileNav.tsx`
- **Rota**: Nova rota `/area-pj` no `App.tsx`
- **Pagina**: Dashboard com sistema de Tabs (3 abas)
- **Banco de Dados**: 3 novas tabelas com RLS
- **Estado**: Extensao do Zustand store
- **Realtime**: Sincronizacao em tempo real

---

### 1. Banco de Dados (Migrations)

#### Tabela 1: `corporate_pricing` (Precificador)
```sql
CREATE TABLE public.corporate_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  margin_percent NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  real_margin NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.corporate_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pricing" ON corporate_pricing FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pricing" ON corporate_pricing FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pricing" ON corporate_pricing FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pricing" ON corporate_pricing FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_corporate_pricing_updated_at
  BEFORE UPDATE ON public.corporate_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.corporate_pricing;
```

#### Tabela 2: `corporate_investments` (Investimentos)
```sql
CREATE TABLE public.corporate_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'equipamento',
  amount NUMERIC NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.corporate_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own investments" ON corporate_investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own investments" ON corporate_investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own investments" ON corporate_investments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own investments" ON corporate_investments FOR DELETE USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_corporate_investments_updated_at
  BEFORE UPDATE ON public.corporate_investments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.corporate_investments;
```

#### Tabela 3: `corporate_team` (Colaboradores)
```sql
CREATE TABLE public.corporate_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'pj',
  cost NUMERIC NOT NULL DEFAULT 0,
  payment_day INTEGER NOT NULL DEFAULT 5,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.corporate_team ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own team" ON corporate_team FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own team" ON corporate_team FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own team" ON corporate_team FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own team" ON corporate_team FOR DELETE USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_corporate_team_updated_at
  BEFORE UPDATE ON public.corporate_team
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.corporate_team;
```

---

### 2. Tipos TypeScript (`src/types/database.ts`)

```typescript
// Novos tipos a adicionar
export type InvestmentCategory = 'equipamento' | 'software' | 'mobilia' | 'marketing' | 'outro';
export type ContractType = 'pj' | 'clt' | 'freelancer';

export interface CorporatePricing {
  id: string;
  user_id: string;
  item_name: string;
  cost: number;
  tax_rate: number;
  margin_percent: number;
  final_price: number;
  profit: number;
  real_margin: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CorporateInvestment {
  id: string;
  user_id: string;
  item_name: string;
  category: InvestmentCategory;
  amount: number;
  purchase_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CorporateTeamMember {
  id: string;
  user_id: string;
  name: string;
  role: string;
  contract_type: ContractType;
  cost: number;
  payment_day: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

---

### 3. Zustand Store (`src/stores/useAppStore.ts`)

Adicionar ao estado e acoes:

```typescript
// Estado
corporatePricings: CorporatePricing[];
corporateInvestments: CorporateInvestment[];
corporateTeam: CorporateTeamMember[];

// Acoes - Pricing
setCorporatePricings: (pricings: CorporatePricing[]) => void;
addCorporatePricing: (pricing: CorporatePricing) => void;
updateCorporatePricing: (id: string, updates: Partial<CorporatePricing>) => void;
deleteCorporatePricing: (id: string) => void;

// Acoes - Investments
setCorporateInvestments: (investments: CorporateInvestment[]) => void;
addCorporateInvestment: (investment: CorporateInvestment) => void;
updateCorporateInvestment: (id: string, updates: Partial<CorporateInvestment>) => void;
deleteCorporateInvestment: (id: string) => void;

// Acoes - Team
setCorporateTeam: (team: CorporateTeamMember[]) => void;
addCorporateTeamMember: (member: CorporateTeamMember) => void;
updateCorporateTeamMember: (id: string, updates: Partial<CorporateTeamMember>) => void;
deleteCorporateTeamMember: (id: string) => void;
```

---

### 4. Hooks de Dados

#### `useInitializeData.ts`
Adicionar fetch das 3 novas tabelas no `Promise.all`

#### `useRealtimeSync.ts`
Adicionar listeners para as 3 novas tabelas

---

### 5. Navegacao

#### `AppSidebar.tsx`
```typescript
// Adicionar no mainNavItems (apos Roteiros)
{ title: 'Area PJ', url: '/area-pj', icon: Building2 },
```

#### `MobileNav.tsx`
```typescript
// Adicionar no moreNavItems
{ title: 'Area PJ', url: '/area-pj', icon: Building2 },
```

---

### 6. Roteamento (`App.tsx`)

```typescript
import AreaPJDashboard from "@/pages/AreaPJDashboard";

// Adicionar rota
<Route path="/area-pj" element={<AreaPJDashboard />} />
```

---

### 7. Componentes do Modulo

#### Estrutura de Arquivos
```
src/components/areapj/
├── PricingCalculator.tsx      # Aba 1: Precificador
├── PricingForm.tsx            # Modal de nova precificacao
├── PricingTable.tsx           # Tabela de historico
├── InvestmentManager.tsx      # Aba 2: Investimentos
├── InvestmentForm.tsx         # Modal de novo investimento
├── TeamManager.tsx            # Aba 3: Gestao de Time
├── TeamMemberForm.tsx         # Modal de novo colaborador
└── TeamMemberCard.tsx         # Card de colaborador
```

#### Pagina Principal: `AreaPJDashboard.tsx`
```typescript
// Estrutura com Tabs
<Tabs defaultValue="pricing" className="space-y-4">
  <TabsList className="grid grid-cols-3 w-full md:w-auto">
    <TabsTrigger value="pricing">
      <Calculator className="w-4 h-4 mr-2" />
      <span className="hidden sm:inline">Precificador</span>
    </TabsTrigger>
    <TabsTrigger value="investments">
      <TrendingUp className="w-4 h-4 mr-2" />
      <span className="hidden sm:inline">Investimentos</span>
    </TabsTrigger>
    <TabsTrigger value="team">
      <Users className="w-4 h-4 mr-2" />
      <span className="hidden sm:inline">Time</span>
    </TabsTrigger>
  </TabsList>

  <TabsContent value="pricing">
    <PricingCalculator />
  </TabsContent>
  <TabsContent value="investments">
    <InvestmentManager />
  </TabsContent>
  <TabsContent value="team">
    <TeamManager />
  </TabsContent>
</Tabs>
```

---

### 8. Detalhamento dos Componentes

#### 8.1 PricingCalculator (Precificador Inteligente)

**Layout:**
- Grid responsivo com formulario a esquerda e cards de resumo a direita
- Cards de KPI com calculo em tempo real
- Tabela de historico abaixo

**Campos do Formulario:**
- Nome do Produto/Servico (texto)
- Custo (R$) - com mascara monetaria
- Impostos (%) - slider ou input
- Margem Desejada (%) - slider ou input

**Cards de Resumo (calculados automaticamente):**
```typescript
// Formulas
const custoComImpostos = cost * (1 + taxRate / 100);
const precoFinal = custoComImpostos * (1 + marginPercent / 100);
const lucroLiquido = precoFinal - custoComImpostos;
const margemReal = (lucroLiquido / precoFinal) * 100;
```

**Acoes:**
- Botao "Calcular" atualiza cards em tempo real
- Botao "Salvar Precificacao" persiste no banco
- Toast de confirmacao ao salvar

#### 8.2 InvestmentManager (Gestao de Investimentos)

**Layout:**
- Botao "Novo Investimento" no header
- Cards de KPI: Total Investido, Por Categoria
- Tabela com todos investimentos

**Campos do Modal:**
- Item (texto)
- Categoria (Select: Equipamento, Software, Mobilia, Marketing, Outro)
- Valor (R$)
- Data da Compra (DatePicker)
- Observacoes (textarea opcional)

**Tabela:**
- Colunas: Item, Categoria (Badge), Valor, Data, Acoes (Editar/Excluir)
- Rodape com "Total Investido" somado
- Cores suaves para indicar saida de caixa (vermelho/laranja)

#### 8.3 TeamManager (Gestao de Time)

**Layout:**
- KPI no topo: "Custo Total Mensal com Equipe"
- Botao "Adicionar Colaborador"
- Grid de cards responsivo

**Campos do Modal:**
- Nome (texto)
- Funcao (texto livre ou Combobox com sugestoes)
- Tipo de Contrato (Select: PJ, CLT, Freelancer)
- Custo Mensal/Pontual (R$)
- Dia do Pagamento (1-31)
- Status Ativo (checkbox)

**Card do Colaborador:**
```typescript
<Card>
  <div className="flex items-center gap-4">
    <Avatar>
      <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
    </Avatar>
    <div>
      <h3 className="font-semibold">{member.name}</h3>
      <Badge variant="outline">{member.role}</Badge>
    </div>
  </div>
  <div className="mt-4 space-y-2 text-sm">
    <p>Contrato: <Badge>{contractTypeLabels[member.contract_type]}</Badge></p>
    <p>Custo: {formatCurrency(member.cost)}</p>
    <p>Pagamento: Dia {member.payment_day}</p>
  </div>
  <div className="mt-4 flex gap-2">
    <Button variant="outline" size="sm">Editar</Button>
    <Button variant="destructive" size="sm">Remover</Button>
  </div>
</Card>
```

---

### 9. Utilitario de Formatacao Monetaria

```typescript
// src/lib/currency.ts
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
}
```

---

### 10. Responsividade Mobile

Todos os componentes seguirao os padroes mobile-first ja estabelecidos:

- **Tabs:** Icons only em mobile, texto completo em desktop
- **Formularios:** Grid de 1 coluna em mobile, 2 colunas em desktop
- **Tabelas:** Substituidas por cards em mobile
- **Dialogs:** `w-[95vw] max-w-lg` para telas pequenas
- **Cards:** Grid responsivo `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

---

### Resumo de Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| **Migration SQL** | Criar 3 tabelas + RLS + Realtime |
| `src/types/database.ts` | Adicionar 3 interfaces + 2 tipos |
| `src/stores/useAppStore.ts` | Adicionar estado + 12 acoes |
| `src/hooks/useInitializeData.ts` | Adicionar fetch de 3 tabelas |
| `src/hooks/useRealtimeSync.ts` | Adicionar 3 listeners |
| `src/components/layout/AppSidebar.tsx` | Adicionar item de navegacao |
| `src/components/layout/MobileNav.tsx` | Adicionar item de navegacao |
| `src/App.tsx` | Adicionar rota |
| `src/pages/AreaPJDashboard.tsx` | **CRIAR** - Pagina principal |
| `src/components/areapj/PricingCalculator.tsx` | **CRIAR** |
| `src/components/areapj/PricingForm.tsx` | **CRIAR** |
| `src/components/areapj/PricingTable.tsx` | **CRIAR** |
| `src/components/areapj/InvestmentManager.tsx` | **CRIAR** |
| `src/components/areapj/InvestmentForm.tsx` | **CRIAR** |
| `src/components/areapj/TeamManager.tsx` | **CRIAR** |
| `src/components/areapj/TeamMemberForm.tsx` | **CRIAR** |
| `src/components/areapj/TeamMemberCard.tsx` | **CRIAR** |
| `src/lib/currency.ts` | **CRIAR** (opcional, pode usar inline) |

