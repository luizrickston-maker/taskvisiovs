# Fluxograma de Usabilidade — Menu Projetos

> Análise + redesenho do menu **Projetos** do TaskVision Pro para ajudar gestor e colaborador responsável a identificar atrasos, cadastrar/editar rapidamente e entender o processo passo a passo de cada cliente.

---

## 1. Estado atual — diagnóstico do que existe

A partir da inspeção de [ProjetosDashboard.tsx](src/pages/ProjetosDashboard.tsx), [ProjectCard.tsx](src/components/projetos/ProjectCard.tsx), [ProjectTasksSection.tsx](src/components/projetos/ProjectTasksSection.tsx), [ProjectForm.tsx](src/components/projetos/ProjectForm.tsx) e [ProjectTaskForm.tsx](src/components/projetos/ProjectTaskForm.tsx):

### 1.1 O que já funciona bem
| Elemento | Onde | Por que é bom |
|---|---|---|
| KPIs no topo (Total / Em progresso / Bloqueados / Concluídos) | ProjetosDashboard | Visão instantânea do dia |
| Filtro por categoria + gerenciador | ProjetosDashboard | Reduz ruído |
| 3 visões paralelas (Kanban / Tarefas / Calendário) | Tabs | Atende diferentes mentalidades |
| Drag-and-drop no Kanban | KanbanColumn | Movimentação rápida |
| Barra de progresso tarefas X/Y no card | ProjectCard | Mostra maturidade do projeto |
| Prioridade P1–P5 colorida | priorityConfig | Sinaliza urgência |
| Atribuição a colaborador | ProjectForm / ProjectTaskForm | Responsabilização clara |
| Briefing de Vídeo acoplado à tarefa | ProjectTaskForm | Reduz troca de contexto |

### 1.2 Pontos de fricção / lacunas
| # | Problema | Impacto |
|---|---|---|
| F1 | **Não existe conceito de ETAPA** — só Projeto e Tarefa chata. Para "entender o processo passo a passo de cada cliente" o gestor tem que ler tarefa por tarefa, sem agrupar por fase (Briefing, Roteiro, Captação, Edição, Entrega…) | Visão de processo opaca; impossível saber "em que fase está esse cliente" |
| F2 | **Prioridade P3 e status ficam escondidos em badges pequenas dentro do card** — para o gestor identificar atraso/urgência precisa abrir o card | Decisão atrasada |
| F3 | **Sem indicador de SLA/atraso** — não há destaque para tarefas com prazo vencido ou que vencem hoje | Atrasos passam despercebidos |
| F4 | **Drill-down Projeto → Tarefas é por tab** ("Tarefas"), não por clique no projeto | 2 cliques extras para o operacional; esquece tarefas |
| F5 | **Sem "vista do colaborador responsável"** — todo colaborador vê mesma coisa que o gestor | Sobrecarga cognitiva |
| F6 | **Sem "foco do dia"** nem "minhas tarefas atrasadas" | Colaborador abre o sistema e não sabe por onde começar |
| F7 | **Calendário mostra só tarefas, não deadlines de projeto** | Visão mensal incompleta |
| F8 | **Criação/edição de Projeto está num modal único** — não dá para criar etapas+tarefas em sequência | Cadastro fragmentado |
| F9 | **Sem templates de etapa por categoria de projeto** (Vídeo, Design, Motion) | Mesmo processo recriado toda vez |
| F10 | **Sem edição inline** (mudar status, prazo, responsável direto no card) | Atualizar vira 3 cliques |
| F11 | **Sem atalhos de teclado** (T = tarefa, P = projeto, etc.) | Lentidão para quem usa o sistema o dia todo |
| F12 | **Sem bulk actions** (atribuir N tarefas de uma vez, mudar deadline em lote) | Gerenciar 20+ tarefas é lento |
| F13 | **Histórico/observação da etapa inexistente** — não tem campo "notas do gestor" nem log de mudanças | Perde contexto no dia a dia |
| F14 | **Sem campo "horas realizadas vs estimadas"** — o `estimated_time` é texto livre | Impossível cobrar SLA real |

---

## 2. Princípios de UX aplicados no redesenho

Baseado em metodologias comprovadas (Material Design 3, Nielsen Heuristics, GTD, Kanban com WIP limits, Getting Real, atomic design):

| Princípio | Como aplicar |
|---|---|
| **Hierarquia visível** | `Cliente → Projeto → Etapa → Tarefa` aparece em trilha de migalhas + cards aninhados |
| **Reconhecimento > recordação** | Ícones padronizados para etapa (Briefing 📋, Roteiro 🎬, Captação 🎥, Edição ✂️, Entrega 📦) |
| **Status + SLA visíveis à primeira dobra** | Faixa colorida no topo do card + chip de atraso ("Vence hoje", "Atrasado 2d") |
| **Affordance para ação** | Botão flutuante "Tarefa rápida" em qualquer nível; quick-edit por hover |
| **Filtros como saved views** | "Minhas tarefas atrasadas", "Entregas da semana", "Etapa atual da cliente X" |
| **Permissionamento por papel** | Gestor vê tudo; Colaborador vê só projetos onde `assigned_to = eu` + "Minhas tarefas" |
| **Mobile-first em tarefas** | Status toggle, check, comentário — 1 dedo |
| **Nielsen #6 (Reconhecimento ao invés de memorização)** | Templates de etapa por categoria |
| **Nielsen #7 (Flexibilidade)** | Atalhos teclado + drag + clique + bulk |
| **Lean / Getting Real** | Apenas features que reduzem atrito; "o que precisa ser visto rápido" primeiro |

---

## 3. Modelo de dados proposto (resumo)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Cliente    │ 1───* │   Projeto    │ 1───* │    Etapa     │ 1───* │    Tarefa    │
│ (já existe)  │       │  (já existe) │       │  (NOVA)      │       │ (já existe)  │
└──────────────┘       └──────────────┘       └──────────────┘       └──────────────┘
                                                      │                      │
                                                      └──── order, sla_days, template_id
```

- **Etapa (nova tabela `project_stages`)**: `id`, `project_id`, `name`, `order`, `icon`, `sla_days`, `status` (não iniciada / em andamento / concluída / bloqueada), `started_at`, `completed_at`, `assigned_to`, `notes`, `template_id?`.
- **Tarefa ganha**: `stage_id` (FK opcional), `actual_hours` (number), `sort_order` dentro da etapa.
- **Categorias de projeto ganham um `default_stage_template_id`** — ao criar projeto da categoria, etapas vêm prontas.

---

## 4. Fluxograma de usabilidade — Visão completa

### 4.1 Hierarquia de telas (mapa)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          MENU PROJETOS                                 │
└────────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────┬───────┼────────┬─────────────────┐
        ▼                 ▼       ▼        ▼                 ▼
  ┌──────────┐    ┌──────────┐ ┌──────┐ ┌──────────┐  ┌──────────────┐
  │ Visão    │    │ Minhas   │ │Por   │ │Templates │  │Métricas     │
  │ Geral    │    │ Tarefas  │ │Cliente│ │(config) │  │(velocimet.) │
  └────┬─────┘    └────┬─────┘ └──────┘ └──────────┘  └──────────────┘
       │               │
       ▼               ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                     PROJETO (Drill-down)                            │
  │  ┌───────────────────────────────────────────────────────────────┐  │
  │  │ Cabeçalho: Cliente │ Nome │ Status │ SLA global              │  │
  │  │ Faixa de progresso por ETAPA (barra segmentada)              │  │
  │  └───────────────────────────────────────────────────────────────┘  │
  │  Tabs: Etapas │ Tarefas │ Arquivos │ Comentários │ Histórico       │
  │                                                                     │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
  │  │ Etapa 1  │ │ Etapa 2  │ │ Etapa 3  │ │ Etapa 4  │ │ Etapa 5  │    │
  │  │ Briefing │ │ Roteiro  │ │ Captação │ │ Edição   │ │ Entrega  │    │
  │  │  ✅ 80%  │ │  ⏳ 40%  │ │  🔴 ATR  │ │  ⚪ 0%   │ │  ⚪ 0%   │    │
  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │
  │       ▼            ▼            ▼            ▼            ▼          │
  │  ┌──────────────────────────────────────────────────────────────┐    │
  │  │                  TAREFAS DA ETAPA                            │    │
  │  │   [ ] Tarefa com prioridade, responsável, prazo, checkbox   │    │
  │  └──────────────────────────────────────────────────────────────┘    │
  └─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Fluxograma operacional — uso diário

```
 ┌─────────────────────────────────────────────────────────────────────┐
 │  ACESSO DO GESTOR                                                    │
 │  Login → Menu Projetos → "Visão Geral"                               │
 └─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────────────────┐
        │  TELA 1 — VISÃO GERAL (Visão Geral padrão)              │
        │  ┌─────────────────────────────────────────────────┐    │
        │  │ Faixa superior: KPIs + chips de alerta          │    │
        │  │ [🔴 3 atrasados] [🟡 5 vence hoje] [📋 12]    │    │
        │  ├─────────────────────────────────────────────────┤    │
        │  │ Filtros rápidos (chips):                        │    │
        │  │ [Todos] [Vídeo] [Design] [Motion] [Outros]      │    │
        │  │ [Meus] [Atrasados] [Desta semana] [Concluídos] │    │
        │  ├─────────────────────────────────────────────────┤    │
        │  │ Lista de PROJETOS (cards ou linhas) —           │    │
        │  │ cada card com:                                  │    │
        │  │  • Barra colorida de PRIORIDADE no topo          │    │
        │  │  • Nome projeto + cliente                        │    │
        │  │  • Avatar do responsável                         │    │
        │  │  • Barra segmentada de ETAPAS (▰▰▰▱▱▱)          │    │
        │  │  • Chip SLA: "Vence em 3d" / "Atrasado 1d" 🔴   │    │
        │  │  • Botão "Ver projeto" (1 clique)               │    │
        │  └─────────────────────────────────────────────────┘    │
        └─────────────────────────────────────────────────────────┘
                                  │
                  ┌───────────────┼───────────────┐
                  ▼               ▼               ▼
          ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
          │ 1 clique →   │ │ + Novo       │ │ Filtro       │
          │ Detalhe proj │ │ Projeto      │ │ "Atrasados"  │
          └──────────────┘ └──────────────┘ └──────────────┘
                  │
                  ▼
        ┌─────────────────────────────────────────────────────────┐
        │  TELA 2 — DETALHE DO PROJETO                             │
        │  Migalhas: Projetos / Cliente X / Campanha Verão 2025   │
        │  ┌─────────────────────────────────────────────────────┐│
        │  │ HEADER:                                             ││
        │  │ Nome │ Cliente │ Responsável │ SLA global │ Ações   ││
        │  │ [📁 Arquivo] [✏️ Editar] [📌 Fixar] [⋯ Mais]       ││
        │  ├─────────────────────────────────────────────────────┤│
        │  │ Barra segmentada: [Briefing✅][Roteiro⏳][Cap🔴]…  ││
        │  │ Sliders arrastáveis para mover etapa                ││
        │  ├─────────────────────────────────────────────────────┤│
        │  │ TABS: Etapas │ Tarefas │ Arquivos │ Comentários │ 👁││
        │  │                                                       ││
        │  │ Tab "Etapas" (padrão):                               ││
        │  │ Lista vertical de ETAPAS — cada etapa expansível:    ││
        │  │   ▾ 1ª Etapa — Briefing ✅                          ││
        │  │     [✓] Reunião alinhamento  │ 👤 João │ 02/07 ✅ ││
        │  │     [✓] Coletar referências  │ 👤 Ana  │ 03/07 ✅ ││
        │  │     [ ] Definir objetivo     │ 👤 —    │ 05/07 ⚪ ││
        │  │     [ ] Análise concorrência  │ 👤 —    │ 06/07 ⚪ ││
        │  │     [+ Nova tarefa]                                 ││
        │  │   ▾ 2ª Etapa — Roteiro ⏳ 40%                       ││
        │  │   ▸ 3ª Etapa — Captação 🔴 ATRASADA                ││
        │  │     "⚠️ Tarefa X atrasada há 2 dias"               ││
        │  │   ▸ 4ª Etapa — Edição ⚪                            ││
        │  │   ▸ 5ª Etapa — Entrega ⚪                           ││
        │  │   [+ Nova Etapa]                                    ││
        │  └─────────────────────────────────────────────────────┘│
        └─────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────┬────────┼────────┬─────────────────┐
        ▼                 ▼        ▼        ▼                 ▼
  ┌──────────────┐ ┌──────────┐ ┌──────┐ ┌──────────────┐ ┌──────────────┐
  │ Checkbox     │ │ Quick    │ │ Quick│ │ Adicionar    │ │ Comentário   │
  │ da tarefa    │ │ edit (⌥) │ │ edit │ │ comentário   │ │ no projeto   │
  │ → atualiza   │ │ muda     │ │ data │ │ na etapa     │ │ (@colabor.)  │
  │ status auto  │ │ status   │ │ (📅) │ │              │ │              │
  └──────────────┘ └──────────┘ └──────┘ └──────────────┘ └──────────────┘
```

### 4.3 Fluxograma de cadastro (criação otimizada)

```
       ┌─────────────────────────────┐
       │  Botão "+ Novo Projeto"     │
       └──────────────┬──────────────┘
                      ▼
       ┌─────────────────────────────────────┐
       │  Passo 1 (wizard, não modal único)  │
       │  ─────────────────────────────────  │
       │  • Cliente (select / + novo)        │
       │  • Nome do projeto                  │
       │  • Categoria (define TEMPLATE)      │
       │  • Responsável                      │
       │  • Prioridade (default P3, ajuste)  │
       │  • Data de entrega global           │
       │                                     │
       │  [← Voltar]   [Avançar →]           │
       └────────────────┬────────────────────┘
                        ▼
       ┌─────────────────────────────────────┐
       │  Passo 2 — ETAPAS (auto-fill)        │
       │  ─────────────────────────────────  │
       │  ▶ Template "Vídeo" sugerido:        │
       │     1. Briefing      [5 dias]        │
       │     2. Roteiro       [3 dias]        │
       │     3. Captação      [2 dias]        │
       │     4. Edição        [4 dias]        │
       │     5. Entrega       [1 dia]         │
       │   [↺ Usar template] [✎ Editar]      │
       │   [➕ Add etapa] [↕ Reordenar]       │
       │  [← Voltar] [Avançar →]              │
       └────────────────┬────────────────────┘
                        ▼
       ┌─────────────────────────────────────┐
       │  Passo 3 — REVISÃO E CRIAR           │
       │  Resumo visual + contador           │
       │  [← Voltar] [✓ Criar projeto]       │
       └────────────────┬────────────────────┘
                        ▼
                ┌───────────────────┐
                │  Projeto criado   │
                │  Vai p/ detalhe   │
                │  Etapas prontas   │
                │  p/ receber tarefas│
                └───────────────────┘
```

### 4.4 Fluxograma do colaborador responsável

```
 ┌────────────────────────────────────────────────────────────┐
 │  COLABORADOR — vista filtrada automaticamente              │
 │  Landpage: "Minhas Tarefas" (não "Visão Geral")            │
 └────────────────────────────┬───────────────────────────────┘
                              ▼
        ┌─────────────────────────────────────────────────┐
        │  FAIXA "HOJE" no topo                           │
        │  🔥 2 atrasadas │ 📌 5 vence hoje │ 📋 12 fut.  │
        ├─────────────────────────────────────────────────┤
        │  Lista única de TAREFAS (não projetos)          │
        │  agrupadas por projeto + etapa:                  │
        │                                                  │
        │  ► Cliente A / Campanha Verão / Etapa Edição    │
        │   ☐ [P1] Cortar trecho X   ⏱ 2h     [⌥ editar]  │
        │   ☐ [P2] Color grade      ⏱ 1h     [⌥ editar]  │
        │  ────────────────────────────────────────────── │
        │  ► Cliente B / Reels / Etapa Roteiro             │
        │   ☐ [🔴 ATR] Enviar texto   ⏱ 30min [⌥ editar]  │
        │  ────────────────────────────────────────────── │
        │  [+ Tarefa rápida]                              │
        └─────────────────────────────────────────────────┘
                              │
                  ┌───────────┼───────────┐
                  ▼           ▼           ▼
            Checkbox      Calendário    Notificação
            (✓ status)   (data slider)  (badge sinalizador)
```

**Diferença chave por papel:**

| | Gestor | Colaborador |
|---|---|---|
| Tela inicial | Visão Geral (todos os projetos) | "Minhas Tarefas" (tarefas atribuídas) |
| Foco do card | Cliente, SLA global, etapas | Tarefa, prazo curto, ação direta |
| KPIs | Saúde do projeto (% concluído no prazo) | "Minhas pendências" |
| Ações rápidas | Atribuir, mudar prioridade, reagendar | Concluir, comentar, anexar |

### 4.5 Sistema de detecção de atraso (SLA)

```
┌────────────────────────────────────────────────────────────────────┐
│                      CÁLCULO DE SLA                                 │
│                                                                    │
│   SLA etapa = (deadline projeto − started_at)                      │
│   SLA tarefa = task.deadline                                        │
│                                                                    │
│   Status derivado automaticamente:                                  │
│   ┌──────────┬──────────────────┬────────────────────────────┐    │
│   │ Cor      │ Condição         │ Onde aparece               │    │
│   ├──────────┼──────────────────┼────────────────────────────┤    │
│   │ 🟢 Verde │ > 3d restantes  │ Card, barra de etapas      │    │
│   │ 🟡 Amarelo│ 0–3d restantes  │ Card, badge "Vence em Xd" │    │
│   │ 🟠 Laranja│ vence hoje       │ Topo da página + badge     │    │
│   │ 🔴 Verm. │ < 0 (atrasado)   │ Topo da página + alerta    │    │
│   └──────────┴──────────────────┴────────────────────────────┘    │
│                                                                    │
│   • Chip "🔴 Atrasado 2d" pisca suavemente (animação sutil)       │
│   • Em "Minhas Tarefas", atrasos ficam no topo                     │
│   • Gestor recebe pop-up leve ao logar se tem projeto atrasado     │
└────────────────────────────────────────────────────────────────────┘
```

### 4.6 Ações rápidas / quick-edit

| Atalho | Ação | Onde |
|---|---|---|
| Click no card | Abre detalhe do projeto | Lista/Geral |
| Click na etapa | Expande tarefas (accordion) | Detalhe |
| Click no checkbox | Marca tarefa (toggle status) | Lista de tarefas |
| Hover + ✏️ | Quick-edit (popover) | Card/tarefa |
| Right-click | Menu: editar, duplicar, mover, atribuir | Card/tarefa |
| `N` | Nova tarefa (modal inline) | Detalhe projeto |
| `E` | Nova etapa | Detalhe projeto |
| `P` | Novo projeto (wizard) | Qualquer tela |
| `/` | Busca global | Global |
| `⇧+click` | Seleção múltipla → bulk action | Lista |
| Arrastar tarefa entre etapas | Move + atualiza status | Detalhe projeto |

### 4.7 Estados visuais padronizados

```
┌────────────────────────────────────────────────────────────────────┐
│  PRIORIDADE                              STATUS                     │
│  ▰ P1 🔴 Crítica      (vermelho cheio)   ▰ ✅ Concluído (verde)    │
│  ▰ P2 🟠 Alta         (laranja)          ▰ ⏳ Em andamento (azul)  │
│  ▰ P3 🟡 Média        (amarelo)          ▰ ⚪ Não iniciada (cinza) │
│  ▰ P4 🔵 Baixa        (azul claro)       ▰ 🚫 Bloqueada (vermelho) │
│  ▰ P5 ⚪ Mínima       (cinza)            ▰ 🔴 Atrasada (verm. pisca)│
└────────────────────────────────────────────────────────────────────┘

SLAs / Prazos (chip com fundo):
  🟢 No prazo      | 🟡 Vence em até 3d | 🟠 Vence hoje | 🔴 Atrasada
```

---

## 5. Quick wins — implementação incremental sugerida

| # | Mudança | Esforço | Impacto | Por quê |
|---|---|---|---|---|
| 1 | **Adicionar tabela `project_stages`** + UI mínima: criar/renomear/ordenar etapas por projeto; vira agrupador de tarefas | M | Alto | Resolve F1, atende "processo passo a passo" |
| 2 | **Indicador SLA + destaque de atraso** em ProjectCard e ProjectTask (chip colorido à esquerda do título) | P | Alto | Resolve F2, F3 — gestores veem atrasos sem clicar |
| 3 | **Página "Minhas Tarefas"** como segunda aba/landing para colaborador | P | Alto | Resolve F5, F6 |
| 4 | **Drill-down Projeto → Etapas → Tarefas** (clicar projeto abre detalhe com etapas já prontas) | M | Alto | Resolve F4 |
| 5 | **Wizard de 3 passos para criar projeto** (informações → etapas via template → revisar) | M | Médio | Resolve F8 |
| 6 | **Templates de etapa por categoria** (config em Admin > Categorias) | M | Médio | Resolve F9 |
| 7 | **Edição inline** de status, prazo e responsável (popover on hover) | M | Alto | Resolve F10 |
| 8 | **Atalhos de teclado** (`N`, `E`, `P`, `/`, setas) | P | Médio | Resolve F11 |
| 9 | **Bulk actions** (seleção múltipla + barra de ação) | P | Médio | Resolve F12 |
| 10 | **Campo "observações da etapa"** + log de mudanças (audit trail) | M | Médio | Resolve F13 |
| 11 | **Calendário mostra projetos + tarefas** (chips duplos por dia) | P | Médio | Resolve F7 |
| 12 | **`actual_hours` em tarefa + comparativo vs `estimated_hours`** | P | Baixo | Resolve F14 |

> P = pequeno (≤ 1 sprint), M = médio (1–2 sprints). Implementar 1–6 já muda o jogo.

---

## 6. Métricas de sucesso (após redesenho)

- **Tempo médio para encontrar uma tarefa** cair de ~30s para <5s
- **% projetos sem SLA definido** = 0
- **% atrasos sinalizados ao gestor** > 95% (atualmente, atrasos só aparecem quando alguém olha a lista)
- **Ações por dia (cadastros/edições)** no menu Projetos aumentar 2–3× (sinal de uso fluente)
- **NPS do colaborador** ("é fácil usar meu dia a dia") > 8

---

## 7. Resumo final do fluxograma em 1 página

```
        ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │ Cliente  │    │   Projeto    │    │    Etapa     │    │   Tarefa     │
        └────┬─────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
             │                 │                  │                   │
             ▼                 ▼                  ▼                   ▼
       Identifica o   Cria com 3 cliques    Agrupa tarefas      Toggle 1-clique
       "dono" do      (wizard + template)   por fase do          muda status;
       processo       define SLA global     processo (Briefing,  SLA colore o
                                            Roteiro, …)         chip
                          │
                          ▼
              ┌─────────────────────┐
              │ SISTEMA DE SLA      │
              │ recalcula ao logar  │
              │ → atraso destacado │
              │   no topo pro gestor│
              └─────────────────────┘

  GESTOR:    Visão Geral → Cliente/Projeto (chips de SLA) → Etapas → Tarefas
  COLABORADOR: Minhas Tarefas (faixa "Hoje" + atrasos primeiro) → abrir → concluir
```

Esse redesenho transforma o menu Projetos de "lista de cards com badges" em um **centro de comando operacional**: o gestor enxerga onde o cliente está atrasado com 1 olhada, e o colaborador responsável abre o sistema e já sabe **exatamente em que vai trabalhar hoje**.
