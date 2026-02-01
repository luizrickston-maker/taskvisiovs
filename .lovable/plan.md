

## Plano: Redesign Profissional da Tela de Projetos

### Problemas Identificados

Analisei a tela de Projetos (`/projetos` e `/pj/projetos`) e comparei com outras telas do app como "Planos de Servico", "Caixa" e "Financas". Identifiquei os seguintes problemas:

| Problema | Descricao |
|----------|-----------|
| **Header inconsistente** | Falta o padrao de header com icone + titulo + descricao usado em outras paginas |
| **Sem KPIs visuais** | Outras telas tem cards de resumo (KPIs) no topo; Projetos nao tem |
| **Espacamento irregular** | Gaps e espacamentos nao seguem o sistema de design (space-y-6 padrao) |
| **Filtros desorganizados** | Filtros e botao misturados no header sem separacao visual |
| **Categorias sem destaque** | Barra de categorias parece perdida, sem container/card |
| **Cards Kanban simples** | Cards do projeto muito basicos comparados ao padrao glass-card do app |
| **Secao de Tarefas isolada** | Falta transicao visual entre Kanban e secao de Tarefas |
| **Mobile nao otimizado** | Layout nao responsivo como outras paginas |

---

### Solucao Proposta

Redesenhar a tela de Projetos seguindo exatamente os padroes visuais das telas profissionais do app:

---

### Alteracoes no ProjetosDashboard.tsx

**1. Header Profissional**

Adicionar o padrao de header com icone destacado:

```text
+--------------------------------------------------+
|  [Icone]  Projetos                               |
|           Gerencie seus projetos e tarefas       |
+--------------------------------------------------+
```

**2. KPIs de Resumo**

Adicionar cards de metricas no topo (como PlansManager):

```text
+-------------+  +-------------+  +-------------+  +-------------+
| Total       |  | Em Progresso|  | Bloqueados  |  | Concluidos  |
| 12 projetos |  | 4 projetos  |  | 2 projetos  |  | 6 projetos  |
+-------------+  +-------------+  +-------------+  +-------------+
```

**3. Barra de Filtros Organizada**

Separar filtros do botao de acao com layout claro:

```text
+--------------------------------------------------+
| [Filtro] [Categoria]   Categorias: [+] [Dev] [UI]|
|                                     [Novo Projeto]|
+--------------------------------------------------+
```

**4. Tabs para Organizar Conteudo**

Usar Tabs para separar Kanban e Tarefas:

```text
[Quadro Kanban]  [Tarefas]
```

---

### Alteracoes no KanbanColumn.tsx

**1. Estilo Glass-Card**

Atualizar para usar `glass-card` consistente com o resto do app.

**2. Header com Badge de Contador**

Melhorar header com badge estilizado para contagem.

**3. Area de Drop Melhorada**

Adicionar feedback visual mais claro ao arrastar.

---

### Alteracoes no ProjectCard.tsx

**1. Hover e Shadow Consistentes**

Usar mesmas sombras e transicoes das outras cards do app.

**2. Layout de Informacoes**

Reorganizar informacoes com hierarquia visual clara.

**3. Botoes de Acao em Dropdown**

Mover acoes para um menu dropdown (padrao usado em outras partes do app).

---

### Alteracoes no CategoryManager.tsx

**1. Container com Card**

Envolver categorias em um Card sutil para dar destaque.

**2. Estilo de Pills Melhorado**

Pills mais visiveis com hover states consistentes.

---

### Nova Estrutura Visual

```text
+------------------------------------------------------------------+
|  [FolderKanban]  Projetos                                         |
|                  Gerencie seus projetos e tarefas                 |
+------------------------------------------------------------------+

+----------+  +----------+  +----------+  +----------+
| Total    |  | A Fazer  |  | Progresso|  | Concluido|
| 15       |  | 5        |  | 6        |  | 4        |
+----------+  +----------+  +----------+  +----------+

+------------------------------------------------------------------+
| Filtros: [Categoria v] [Status v]              [+ Novo Projeto]  |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| Categorias: [+ Nova] [Desenvolvimento] [Design] [Marketing]      |
+------------------------------------------------------------------+

[Quadro]  [Tarefas]

+----------+  +----------+  +----------+  +----------+
| A Fazer  |  | Progresso|  | Bloqueado|  | Concluido|
| (5)      |  | (3)      |  | (1)      |  | (6)      |
|----------|  |----------|  |----------|  |----------|
| [Card 1] |  | [Card 1] |  | [Card 1] |  | [Card 1] |
| [Card 2] |  | [Card 2] |  |          |  | [Card 2] |
+----------+  +----------+  +----------+  +----------+
```

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/ProjetosDashboard.tsx` | Redesign completo com header, KPIs, tabs |
| `src/components/projetos/KanbanColumn.tsx` | Estilo glass-card, header melhorado |
| `src/components/projetos/ProjectCard.tsx` | Layout reorganizado, dropdown de acoes |
| `src/components/projetos/CategoryManager.tsx` | Container card, pills melhoradas |
| `src/components/projetos/ProjectTasksSection.tsx` | Ajustes menores de estilo |

---

### Detalhes Tecnicos

**CSS Classes Padrao do App:**
- `glass-card` para cards com backdrop blur
- `animate-fade-in` para entrada suave
- `space-y-6` entre secoes principais
- `gap-4` entre cards de grid
- Headers com `p-2 rounded-lg bg-primary/10` para icone
- Titulos com `font-display font-bold`

**Componentes UI:**
- Usar `Tabs` do shadcn para separar Kanban/Tarefas
- Usar `Badge` para contadores
- Usar `DropdownMenu` para acoes de card
- Usar `Separator` entre secoes

**Responsividade:**
- Grid 1 coluna no mobile
- Grid 2 colunas no tablet (md)
- Grid 4 colunas no desktop (xl)
- Botoes full-width no mobile

---

### Resultado Esperado

- Visual consistente com o resto do app
- Hierarquia visual clara (header -> KPIs -> filtros -> conteudo)
- Melhor experiencia de usuario no mobile
- Transicoes suaves e feedback visual ao interagir
- Padroes de design profissionais aplicados

