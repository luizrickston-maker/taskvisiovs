
## Plano: Modulo "Projetos e Tarefas" para Gestao de Clientes

### Visao Geral

Criar um novo modulo "Projetos" no menu empresarial (PJ) que permite gerenciar projetos de cada cliente com rastreabilidade completa de tarefas, progresso, prioridades e tempos de execucao. Este modulo se integra diretamente com o Pipeline de Prospecao, substituindo o sistema de projetos pessoais por um focado em gestao de clientes.

---

### Analise da Situacao Atual

**O que existe hoje:**
1. Tabela `projects` - projetos pessoais no modo Pessoal (Kanban)
2. Tabela `project_tasks` - tarefas vinculadas a projetos
3. Campo `project_id` em `prospects` - vinculo (nao utilizado adequadamente)
4. Sistema de categorias de projeto (`project_categories`)

**Problemas identificados:**
1. Projetos existentes sao focados em produtividade pessoal, nao gestao de clientes
2. Nao ha campos para vincular cliente/empresa ao projeto
3. Tarefas nao tem data de conclusao (deadline)
4. Nao ha campo de tempo estimado/real de execucao nas tarefas
5. Progresso do projeto nao e calculado automaticamente
6. Prospecao nao puxa projetos existentes de forma logica

---

### Solucao Proposta: Nova Estrutura de Dados

#### Opcao 1: Estender Tabela Existente (Recomendada)
Adicionar novos campos a tabela `projects` para suportar gestao empresarial:

```text
Novos campos na tabela 'projects':
- client_name TEXT           # Nome do cliente (para projetos PJ)
- company_name TEXT          # Empresa do cliente
- deadline DATE              # Data de entrega prevista
- is_corporate BOOLEAN       # Diferencia projeto pessoal de empresarial
- prospect_id UUID           # Vinculo reverso com prospecao fechada
```

#### Novos campos na tabela `project_tasks`:
```text
Novos campos na tabela 'project_tasks':
- deadline DATE              # Data limite da tarefa
- estimated_hours NUMERIC    # Tempo estimado em horas
- actual_hours NUMERIC       # Tempo real executado
- completed_at TIMESTAMPTZ   # Data de conclusao
```

---

### Arquitetura do Modulo

```text
Modo Empresarial (Sidebar):
+------------------------+
| Comercial              |
| Projetos        [NOVO] |  <-- Novo menu
| Financeiro             |
| Planos                 |
| Investimentos          |
| Time                   |
+------------------------+
```

---

### Estrutura da Pagina "Projetos"

```text
+------------------------------------------------------------------+
| [FolderKanban] Projetos de Clientes                              |
| Gerencie projetos e acompanhe o progresso de cada cliente        |
+------------------------------------------------------------------+
| [+ Novo Projeto]  [Filtro: Status] [Filtro: Cliente]             |
+------------------------------------------------------------------+
| LISTA DE PROJETOS (Cards ou Tabela)                              |
|                                                                  |
| +--------------------------------------------------------------+ |
| | Projeto: Website Empresa XYZ                                 | |
| | Cliente: Joao Silva | Empresa: XYZ Ltda                      | |
| | Status: [Em Progresso]  Prioridade: P1                       | |
| | Prazo: 15/02/2026   Progresso: [========    ] 65%            | |
| | Tarefas: 6/10 concluidas                                     | |
| +--------------------------------------------------------------+ |
|                                                                  |
| +--------------------------------------------------------------+ |
| | Projeto: Automacao com IA                                    | |
| | Cliente: Maria Costa | Empresa: ABC Corp                     | |
| | Status: [A Fazer]  Prioridade: P2                            | |
| | Prazo: 20/03/2026   Progresso: [          ] 0%               | |
| | Tarefas: 0/5 concluidas                                      | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

---

### Pagina de Detalhes do Projeto (Modal ou Pagina)

```text
+------------------------------------------------------------------+
| [<- Voltar] Projeto: Website Empresa XYZ                         |
+------------------------------------------------------------------+
| Cliente: Joao Silva           | Empresa: XYZ Ltda                |
| Prazo: 15/02/2026             | Prioridade: P1 - Critica         |
| Status: Em Progresso          | Progresso: 65%                   |
+------------------------------------------------------------------+
|                                                                  |
| TAREFAS DO PROJETO                          [+ Nova Tarefa]      |
|                                                                  |
| [A Fazer] [Em Andamento] [Concluido]   <- Tabs ou Kanban mini    |
|                                                                  |
| +--------------------------------------------------------------+ |
| | [x] Configurar hospedagem                   P2 | 2h | 2.5h   | |
| |     Concluido em 10/01/2026                                  | |
| +--------------------------------------------------------------+ |
| | [~] Desenvolver homepage                    P1 | 8h | 4h     | |
| |     Prazo: 01/02/2026  (em andamento)                        | |
| +--------------------------------------------------------------+ |
| | [ ] Implementar formulario de contato       P3 | 3h | -      | |
| |     Prazo: 10/02/2026                                        | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
| RESUMO DE TEMPO                                                  |
| Estimado Total: 25h  |  Executado: 12h  |  Restante: 13h         |
+------------------------------------------------------------------+
```

---

### Integracao com Pipeline Comercial

**Fluxo Ideal:**
1. Usuario cria prospecao no Comercial
2. Quando status muda para "Fechado", pode criar projeto automaticamente
3. Ou seleciona projeto existente (criado previamente)
4. Projeto aparece na lista de "Projetos de Clientes"
5. Usuario adiciona tarefas ao projeto
6. Progresso e calculado automaticamente

**Modificacoes no ProspectForm:**
- Campo "Projeto Vinculado" ja existe
- Adicionar botao "Criar Novo Projeto" ao lado
- Ao criar projeto, preenche cliente/empresa automaticamente

---

### Banco de Dados - Migrations Necessarias

```sql
-- Adicionar campos empresariais a tabela projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS deadline DATE,
ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL;

-- Adicionar campos de gestao a tabela project_tasks
ALTER TABLE public.project_tasks
ADD COLUMN IF NOT EXISTS deadline DATE,
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
```

---

### Tipos TypeScript Atualizados

```typescript
// Atualizar interface Project
export interface Project {
  id: string;
  user_id: string;
  task: string;
  project: string;
  project_category_id?: string;
  priority: number;
  status: ProjectStatus;
  estimated_time?: string;
  // Novos campos PJ
  client_name?: string;
  company_name?: string;
  deadline?: string;
  is_corporate: boolean;
  prospect_id?: string;
  created_at: string;
  updated_at: string;
}

// Atualizar interface ProjectTask
export interface ProjectTask {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description?: string;
  priority: number;
  status: ProjectTaskStatus;
  // Novos campos
  deadline?: string;
  estimated_hours: number;
  actual_hours: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}
```

---

### Componentes a Criar/Modificar

```text
src/pages/PJ/
├── ProjetosClientesPage.tsx    # NOVO - Pagina principal

src/components/areapj/projetos/
├── ClientProjectList.tsx        # NOVO - Lista de projetos
├── ClientProjectCard.tsx        # NOVO - Card de projeto com progresso
├── ClientProjectForm.tsx        # NOVO - Form criar/editar projeto
├── ClientProjectDetail.tsx      # NOVO - Detalhes do projeto
├── ClientTaskList.tsx           # NOVO - Lista de tarefas
├── ClientTaskForm.tsx           # NOVO - Form criar/editar tarefa
└── TimeTracker.tsx              # NOVO - Resumo de tempo

src/components/comercial/
├── ProspectForm.tsx             # MODIFICAR - Adicionar criacao rapida de projeto
```

---

### Navegacao

Adicionar ao `businessNavItems` em AppSidebar.tsx:

```typescript
const businessNavItems = [
  { title: 'Comercial', url: '/comercial', icon: Briefcase },
  { title: 'Projetos', url: '/pj/projetos', icon: FolderKanban },  // NOVO
  { title: 'Financeiro', url: '/pj/financeiro', icon: Wallet },
  { title: 'Planos', url: '/pj/planos', icon: Package },
  { title: 'Investimentos', url: '/pj/investimentos', icon: TrendingUp },
  { title: 'Time', url: '/pj/time', icon: Users },
];
```

---

### Funcionalidades de Calculo

**Progresso do Projeto (automatico):**
```typescript
const calcularProgresso = (tarefas: ProjectTask[]) => {
  if (tarefas.length === 0) return 0;
  const concluidas = tarefas.filter(t => t.status === 'done').length;
  return Math.round((concluidas / tarefas.length) * 100);
};
```

**Resumo de Tempo:**
```typescript
const calcularTempos = (tarefas: ProjectTask[]) => {
  const estimadoTotal = tarefas.reduce((sum, t) => sum + t.estimated_hours, 0);
  const executadoTotal = tarefas.reduce((sum, t) => sum + t.actual_hours, 0);
  const restante = estimadoTotal - executadoTotal;
  return { estimadoTotal, executadoTotal, restante };
};
```

---

### UI/UX Diretrizes

1. **Hierarquia Visual Clara:**
   - Projetos com prazo proximo destacados em amarelo
   - Projetos atrasados destacados em vermelho
   - Barra de progresso colorida (verde > 80%, amarelo 50-80%, vermelho < 50%)

2. **Responsividade:**
   - Cards em grid no desktop (3 colunas)
   - Cards em lista no mobile
   - Formularios full-width em mobile

3. **Filtros Praticos:**
   - Por status (Todos, A Fazer, Em Progresso, Concluido)
   - Por cliente/empresa
   - Por prazo (Atrasados, Esta Semana, Este Mes)
   - Por prioridade (P1-P5)

4. **Acoes Rapidas:**
   - Clicar no card abre detalhes
   - Arrastar tarefa muda status (mini-kanban)
   - Botao "Adicionar Tempo" para registrar horas

---

### Resumo de Arquivos a Modificar/Criar

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/xxx.sql` | CRIAR - Adicionar campos as tabelas |
| `src/types/database.ts` | MODIFICAR - Atualizar interfaces |
| `src/stores/useAppStore.ts` | MODIFICAR - Filtros de projetos corporativos |
| `src/pages/PJ/ProjetosClientesPage.tsx` | CRIAR - Pagina principal |
| `src/components/areapj/projetos/*.tsx` | CRIAR - Componentes do modulo |
| `src/components/comercial/ProspectForm.tsx` | MODIFICAR - Criar projeto rapido |
| `src/components/layout/AppSidebar.tsx` | MODIFICAR - Adicionar menu |
| `src/components/layout/MobileNav.tsx` | MODIFICAR - Adicionar menu |
| `src/App.tsx` | MODIFICAR - Adicionar rota |
| `src/hooks/useInitializeData.ts` | VERIFICAR - Ja carrega projetos |
| `src/hooks/useRealtimeSync.ts` | VERIFICAR - Ja sincroniza projetos |

---

### Resultado Esperado

1. Novo menu "Projetos" no modo Empresarial
2. Gerenciamento completo de projetos por cliente
3. Tarefas com prazo, tempo estimado e tempo real
4. Calculo automatico de progresso
5. Integracao bidirecional com Pipeline Comercial
6. Visao consolidada de tempo gasto por projeto
7. Filtros e ordenacao praticos
8. Interface responsiva e intuitiva

---

### Secao Tecnica: Ordem de Implementacao

1. **Fase 1 - Banco de Dados**
   - Executar migration para adicionar campos
   - Atualizar tipos TypeScript

2. **Fase 2 - Componentes Base**
   - Criar ClientProjectCard
   - Criar ClientProjectForm
   - Criar ClientTaskForm

3. **Fase 3 - Pagina Principal**
   - Criar ProjetosClientesPage
   - Implementar filtros e listagem

4. **Fase 4 - Detalhes e Tarefas**
   - Criar ClientProjectDetail
   - Implementar gestao de tarefas

5. **Fase 5 - Integracoes**
   - Atualizar ProspectForm
   - Adicionar navegacao
   - Testar fluxo completo

