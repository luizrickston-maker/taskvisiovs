

## Plano: Transformar Precificador em Modulo Financeiro Empresarial Completo

### Visao Geral

Expandir o modulo "Precificador" atual para um sistema completo de gestao financeira empresarial que permita:
1. Gerenciar custos operacionais detalhados (funcionarios, energia, internet, etc.)
2. Criar categorias de custos personalizadas
3. Classificar custos por tipo (recorrente, fixo, pontual)
4. Calcular precificacao baseada no custo real da operacao
5. Reorganizar navegacao com menu "Financeiro" contendo sub-modulos

---

### Nova Estrutura de Navegacao

```text
Modo Empresarial (Sidebar):
+------------------------+
| Comercial              |
| Financeiro      >      |  <-- Novo menu agrupador
|   - Custos             |
|   - Precificador       |
| Planos                 |
| Investimentos          |
| Time                   |
+------------------------+
```

**Alternativa simplificada (recomendada para consistencia com estrutura atual):**

```text
Modo Empresarial (Sidebar):
+------------------------+
| Comercial              |
| Financeiro             |  <-- Dashboard financeiro (custos + precificador)
| Planos                 |
| Investimentos          |
| Time                   |
+------------------------+
```

---

### Parte 1: Banco de Dados

#### Nova Tabela: `corporate_cost_categories`
Categorias de custos personalizaveis:

```sql
CREATE TABLE public.corporate_cost_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE corporate_cost_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cost categories"
  ON corporate_cost_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cost categories"
  ON corporate_cost_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cost categories"
  ON corporate_cost_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cost categories"
  ON corporate_cost_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE corporate_cost_categories;
```

#### Nova Tabela: `corporate_costs`
Custos operacionais detalhados:

```sql
CREATE TABLE public.corporate_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES corporate_cost_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  cost_type TEXT NOT NULL DEFAULT 'recorrente', -- 'recorrente', 'fixo', 'pontual'
  frequency TEXT DEFAULT 'mensal', -- 'mensal', 'anual', 'semanal', 'diario' (para recorrentes)
  start_date DATE,
  end_date DATE, -- NULL para custos sem fim
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies (mesmo padrao)
ALTER TABLE corporate_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own costs"
  ON corporate_costs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own costs"
  ON corporate_costs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own costs"
  ON corporate_costs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own costs"
  ON corporate_costs FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE corporate_costs;

-- Trigger para updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON corporate_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### Parte 2: Tipos TypeScript

Adicionar ao `src/types/database.ts`:

```typescript
// Tipos de custo empresarial
export type CorporateCostType = 'recorrente' | 'fixo' | 'pontual';
export type CostFrequency = 'diario' | 'semanal' | 'mensal' | 'anual';

export interface CorporateCostCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon?: string;
  created_at: string;
}

export interface CorporateCost {
  id: string;
  user_id: string;
  name: string;
  category_id?: string;
  amount: number;
  cost_type: CorporateCostType;
  frequency?: CostFrequency;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

---

### Parte 3: Estado Global (Zustand)

Adicionar ao `useAppStore.ts`:

```typescript
// State
corporateCostCategories: CorporateCostCategory[];
corporateCosts: CorporateCost[];

// Actions
setCorporateCostCategories: (categories: CorporateCostCategory[]) => void;
addCorporateCostCategory: (category: CorporateCostCategory) => void;
updateCorporateCostCategory: (id: string, updates: Partial<CorporateCostCategory>) => void;
deleteCorporateCostCategory: (id: string) => void;

setCorporateCosts: (costs: CorporateCost[]) => void;
addCorporateCost: (cost: CorporateCost) => void;
updateCorporateCost: (id: string, updates: Partial<CorporateCost>) => void;
deleteCorporateCost: (id: string) => void;
```

---

### Parte 4: Nova Pagina Financeiro

Criar `src/pages/PJ/FinanceiroPage.tsx` com abas internas:

```text
+------------------------------------------------------------------+
| [Wallet] Financeiro                                              |
| Gestao completa de custos e precificacao                         |
+------------------------------------------------------------------+
| [Custos] [Precificador] [Categorias]                             |
+------------------------------------------------------------------+
| Conteudo da aba selecionada...                                   |
+------------------------------------------------------------------+
```

#### Aba "Custos" - Componentes:

1. **KPIs no topo:**
   - Total Custos Mensais (recorrentes + fixos ativos)
   - Total Custos Pontuais (mes atual)
   - Custo com Equipe (vinculado ao Time)
   - Custo Operacional (energia, internet, etc.)

2. **Formulario de Novo Custo:**
   - Nome do custo
   - Categoria (dropdown com categorias personalizadas)
   - Valor (R$)
   - Tipo: Recorrente | Fixo | Pontual
   - Frequencia (se recorrente): Mensal | Anual | Semanal
   - Data inicio / Data fim (opcional)
   - Observacoes

3. **Lista de Custos:**
   - Agrupados por categoria
   - Filtros: Tipo, Categoria, Status (ativo/inativo)
   - Toggle ativo/inativo
   - Editar / Excluir

4. **Categorias pre-definidas sugeridas:**
   - Funcionarios CLT
   - Prestadores PJ
   - Freelancers
   - Energia
   - Internet
   - Aluguel
   - Software/SaaS
   - Marketing
   - Outros

#### Aba "Precificador" - Melhorias:

1. **Integracao com custos:**
   - Campo "Custo Base" pode ser calculado automaticamente
   - Botao "Usar custo operacional mensal"
   - Mostra divisao do custo por hora (se informar horas trabalhadas)

2. **Campos adicionais:**
   - Horas estimadas do servico
   - Custo por hora da operacao (calculado)
   - Custo direto do servico + proporcional operacional

3. **Calculos aprimorados:**
   ```
   Custo Total = Custo Direto + (Custo Operacional Mensal / Servicos por Mes)
   Preco Sugerido = Custo Total * (1 + Impostos%) * (1 + Margem%)
   Lucro = Preco - Custo Total - Impostos
   ```

#### Aba "Categorias":

- Gerenciar categorias de custos
- Nome, cor, icone
- Ver quantos custos estao vinculados

---

### Parte 5: Componentes a Criar

```text
src/components/areapj/
├── CostCategoryManager.tsx      # Gerenciar categorias
├── CostForm.tsx                 # Modal de adicionar/editar custo
├── CostList.tsx                 # Lista de custos com filtros
├── CostSummaryCards.tsx         # KPIs de custos
├── FinanceiroDashboard.tsx      # Dashboard principal com abas
└── PricingCalculatorEnhanced.tsx # Precificador melhorado
```

---

### Parte 6: Navegacao

Modificar `AppSidebar.tsx` e `MobileNav.tsx`:

```typescript
const businessNavItems = [
  { title: 'Comercial', url: '/comercial', icon: Briefcase },
  { title: 'Financeiro', url: '/pj/financeiro', icon: Wallet },  // NOVO (substituir Precificador)
  { title: 'Planos', url: '/pj/planos', icon: Package },
  { title: 'Investimentos', url: '/pj/investimentos', icon: TrendingUp },
  { title: 'Time', url: '/pj/time', icon: Users },
];
```

Adicionar rota em `App.tsx`:
```typescript
<Route path="/pj/financeiro" element={<FinanceiroPage />} />
```

Remover rota antiga `/pj/precificador` ou redirecionar para `/pj/financeiro`.

---

### Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/types/database.ts` | Adicionar tipos CorporateCost e CorporateCostCategory |
| `src/stores/useAppStore.ts` | Adicionar state e actions para custos |
| `src/hooks/useInitializeData.ts` | Carregar dados de custos |
| `src/hooks/useRealtimeSync.ts` | Adicionar sync para novas tabelas |
| `src/pages/PJ/FinanceiroPage.tsx` | CRIAR - Nova pagina principal |
| `src/pages/PJ/PrecificadorPage.tsx` | REMOVER ou redirecionar |
| `src/components/areapj/FinanceiroDashboard.tsx` | CRIAR - Dashboard com abas |
| `src/components/areapj/CostCategoryManager.tsx` | CRIAR - Gerenciar categorias |
| `src/components/areapj/CostForm.tsx` | CRIAR - Formulario de custo |
| `src/components/areapj/CostList.tsx` | CRIAR - Lista de custos |
| `src/components/areapj/CostSummaryCards.tsx` | CRIAR - Cards KPI |
| `src/components/areapj/PricingCalculator.tsx` | MODIFICAR - Integrar com custos |
| `src/components/layout/AppSidebar.tsx` | MODIFICAR - Trocar navegacao |
| `src/components/layout/MobileNav.tsx` | MODIFICAR - Trocar navegacao |
| `src/App.tsx` | MODIFICAR - Adicionar nova rota |

---

### Secao Tecnica: Migrations SQL

```sql
-- Migration 1: Criar tabelas de custos empresariais

-- Tabela de categorias de custos
CREATE TABLE IF NOT EXISTS public.corporate_cost_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.corporate_cost_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cost_cat_select" ON corporate_cost_categories 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cost_cat_insert" ON corporate_cost_categories 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cost_cat_update" ON corporate_cost_categories 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cost_cat_delete" ON corporate_cost_categories 
  FOR DELETE USING (auth.uid() = user_id);

-- Tabela de custos
CREATE TABLE IF NOT EXISTS public.corporate_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES corporate_cost_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  cost_type TEXT NOT NULL DEFAULT 'recorrente',
  frequency TEXT DEFAULT 'mensal',
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.corporate_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "costs_select" ON corporate_costs 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "costs_insert" ON corporate_costs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "costs_update" ON corporate_costs 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "costs_delete" ON corporate_costs 
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER set_corporate_costs_updated_at
  BEFORE UPDATE ON corporate_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE corporate_cost_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE corporate_costs;
```

---

### Resultado Esperado

Apos implementacao:
1. Menu lateral tera "Financeiro" em vez de "Precificador"
2. Pagina Financeiro com 3 abas: Custos, Precificador, Categorias
3. Usuario pode cadastrar custos detalhados (energia, internet, funcionarios, etc.)
4. Categorias de custos personalizaveis
5. Classificacao por tipo: recorrente, fixo, pontual
6. Precificador integrado com custos reais da operacao
7. KPIs mostrando custo operacional total
8. Dados sincronizados em tempo real entre dispositivos

