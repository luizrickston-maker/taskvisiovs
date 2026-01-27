

## Plano: Nova Aba "Planos" na Area PJ

### Visao Geral

Adicionar uma nova aba "Planos" ao lado do "Precificador" na Area PJ para gerenciar pacotes de servicos da empresa. A funcionalidade permitira criar planos compostos por itens do precificador, com niveis visuais (Bronze, Prata, Ouro), ajuste de valor final personalizado e calculo automatico de margem de ganho.

---

### 1. Estrutura de Dados

#### Nova Tabela: `service_plans` (Planos/Pacotes)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Identificador unico |
| user_id | UUID | Referencia ao usuario |
| name | TEXT | Nome do plano (ex: "Pacote Marketing Basico") |
| description | TEXT | Descricao detalhada do plano |
| tier | TEXT | Nivel visual: bronze, silver, gold |
| plan_type | TEXT | recorrente ou pontual |
| base_cost | NUMERIC | Soma automatica dos custos dos itens selecionados |
| final_price | NUMERIC | Preco final ajustado pelo usuario |
| profit | NUMERIC | Lucro calculado (final_price - base_cost) |
| profit_margin | NUMERIC | Margem percentual de lucro |
| monthly_limit | TEXT | Limite mensal (ex: "10 horas", "5 entregas") - opcional |
| is_active | BOOLEAN | Se o plano esta ativo para venda |
| notes | TEXT | Observacoes adicionais |
| created_at | TIMESTAMPTZ | Data de criacao |
| updated_at | TIMESTAMPTZ | Data de atualizacao |

#### Nova Tabela: `service_plan_items` (Itens do Plano)

Tabela de relacionamento Many-to-Many entre planos e itens do precificador:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Identificador unico |
| user_id | UUID | Referencia ao usuario (para RLS) |
| plan_id | UUID | Referencia ao plano (FK) |
| pricing_id | UUID | Referencia ao item do precificador (FK) |
| quantity | INTEGER | Quantidade do item no plano |
| custom_price | NUMERIC | Preco customizado (opcional, sobrescreve o original) |
| created_at | TIMESTAMPTZ | Data de criacao |

---

### 2. Tipos TypeScript

```typescript
// Novos tipos em src/types/database.ts
export type PlanTier = 'bronze' | 'silver' | 'gold';
export type PlanType = 'recorrente' | 'pontual';

export interface ServicePlan {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  tier: PlanTier;
  plan_type: PlanType;
  base_cost: number;
  final_price: number;
  profit: number;
  profit_margin: number;
  monthly_limit?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ServicePlanItem {
  id: string;
  user_id: string;
  plan_id: string;
  pricing_id: string;
  quantity: number;
  custom_price?: number;
  created_at: string;
}
```

---

### 3. Atualizacoes no Zustand Store

Adicionar ao `useAppStore.ts`:

**Estado:**
- `servicePlans: ServicePlan[]`
- `servicePlanItems: ServicePlanItem[]`

**Acoes (8 novas):**
- `setServicePlans`, `addServicePlan`, `updateServicePlan`, `deleteServicePlan`
- `setServicePlanItems`, `addServicePlanItem`, `updateServicePlanItem`, `deleteServicePlanItem`

---

### 4. Hooks de Dados

**useInitializeData.ts:**
- Adicionar fetch de `service_plans` e `service_plan_items`

**useRealtimeSync.ts:**
- Adicionar listeners para ambas tabelas

---

### 5. Interface do Usuario

#### 5.1 Dashboard (AreaPJDashboard.tsx)

Atualizar o TabsList de 3 para 4 abas:
- Precificador
- **Planos** (novo - icone `Package`)
- Investimentos
- Time

#### 5.2 Componente PlansManager.tsx

**Layout principal:**
```text
+------------------------------------------+
| [KPI Cards]                               |
| Planos Ativos | Receita Potencial Mensal  |
+------------------------------------------+
| [Filtros: Tier | Tipo | Status]  [+ Novo] |
+------------------------------------------+
| [Grid de Cards de Planos]                 |
|  +--------+  +--------+  +--------+       |
|  | Bronze |  | Silver |  |  Gold  |       |
|  | Plano1 |  | Plano2 |  | Plano3 |       |
|  +--------+  +--------+  +--------+       |
+------------------------------------------+
```

**Cards de Plano:**
- Borda colorida por tier (Bronze=#CD7F32, Silver=#C0C0C0, Gold=#FFD700)
- Badge com o tier no topo
- Nome e descricao
- Lista resumida de itens inclusos
- Preco final destacado
- Margem de lucro (em verde se positiva, vermelho se negativa)
- Botoes: Editar, Duplicar, Excluir
- Toggle de ativo/inativo

#### 5.3 Formulario de Plano (PlanForm.tsx)

Modal Dialog com campos:

**Secao 1 - Informacoes Basicas:**
- Nome do Plano (texto)
- Descricao (textarea)
- Nivel/Tier (Select: Bronze, Prata, Ouro)
- Tipo (Select: Recorrente, Pontual)
- Limite Mensal (texto opcional, ex: "10 horas/mes")
- Status Ativo (switch)

**Secao 2 - Selecao de Servicos:**
- Lista de todos os itens do precificador (corporatePricings)
- Cada item mostra: nome, preco final
- Checkbox para selecionar
- Input de quantidade ao lado de cada item selecionado
- Input opcional para sobrescrever preco individual

**Secao 3 - Resumo de Precos (calculado em tempo real):**
```text
+--------------------------------------+
| Custo Base (soma dos itens):  R$ XXX |
| Preco Final:          [___R$ XXX___] | <- Input editavel
| Lucro:                        R$ XXX | <- Calculado
| Margem de Lucro:               XX.X% | <- Calculado
+--------------------------------------+
```

**Formulas:**
```typescript
const baseCost = selectedItems.reduce((sum, item) => {
  const price = item.custom_price ?? pricing.final_price;
  return sum + (price * item.quantity);
}, 0);

const profit = finalPrice - baseCost;
const profitMargin = finalPrice > 0 ? (profit / finalPrice) * 100 : 0;
```

#### 5.4 Componente PlanCard.tsx

Card visual para cada plano com:
- Indicador de cor do tier na borda esquerda
- Badge do tier (Bronze/Prata/Ouro)
- Nome do plano
- Tipo (badge recorrente/pontual)
- Lista de servicos inclusos (max 3 visíveis + "e mais X...")
- Preco final em destaque
- Margem de lucro com cor condicional
- Limite mensal (se houver)
- Menu de acoes (Editar, Duplicar, Excluir)

---

### 6. Migracao SQL

```sql
-- Tabela de Planos
CREATE TABLE public.service_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL DEFAULT 'bronze',
  plan_type TEXT NOT NULL DEFAULT 'recorrente',
  base_cost NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  profit_margin NUMERIC NOT NULL DEFAULT 0,
  monthly_limit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para service_plans
ALTER TABLE public.service_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own plans" ON service_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON service_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON service_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON service_plans FOR DELETE USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER update_service_plans_updated_at
  BEFORE UPDATE ON public.service_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela de Itens do Plano
CREATE TABLE public.service_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.service_plans(id) ON DELETE CASCADE,
  pricing_id UUID NOT NULL REFERENCES public.corporate_pricing(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  custom_price NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para service_plan_items
ALTER TABLE public.service_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own plan items" ON service_plan_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plan items" ON service_plan_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plan items" ON service_plan_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plan items" ON service_plan_items FOR DELETE USING (auth.uid() = user_id);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_plan_items;
```

---

### 7. Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| **Migration SQL** | Criar 2 tabelas + RLS + Realtime |
| `src/types/database.ts` | Adicionar interfaces ServicePlan, ServicePlanItem + tipos |
| `src/stores/useAppStore.ts` | Adicionar estado + 8 acoes |
| `src/hooks/useInitializeData.ts` | Adicionar fetch de 2 tabelas |
| `src/hooks/useRealtimeSync.ts` | Adicionar 2 listeners |
| `src/pages/AreaPJDashboard.tsx` | Adicionar aba "Planos" |
| `src/components/areapj/PlansManager.tsx` | **CRIAR** - Componente principal |
| `src/components/areapj/PlanForm.tsx` | **CRIAR** - Formulario modal |
| `src/components/areapj/PlanCard.tsx` | **CRIAR** - Card do plano |
| `src/components/areapj/PlanItemSelector.tsx` | **CRIAR** - Seletor de itens |

---

### 8. UX/UI Detalhes

**Cores dos Tiers:**
- Bronze: `#CD7F32` (bg: `bg-amber-700/10`, border: `border-amber-700`)
- Prata: `#C0C0C0` (bg: `bg-slate-400/10`, border: `border-slate-400`)
- Ouro: `#FFD700` (bg: `bg-yellow-500/10`, border: `border-yellow-500`)

**Responsividade Mobile:**
- Grid de cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Formulario: campos em coluna unica no mobile
- Dialog: `w-[95vw] max-w-2xl` para comportar selecao de itens

**Feedback:**
- Toast ao salvar/editar/excluir plano
- Confirmacao antes de excluir
- Indicador visual de margem negativa (alerta vermelho)

