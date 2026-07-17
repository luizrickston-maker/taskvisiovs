# Planejamento: Importar Plano de Projeto gerado por IA

## Visão geral

Fluxo fim-a-fim para que um plano produzido pela IA (a partir do contrato/briefing do cliente) seja automaticamente convertido em Projeto + Etapas + Tarefas + Datas no TaskVision Pro, sem redigitação.

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Contrato /       │ ─► │ IA gera plano    │ ─► │ Usuario cola/    │ ─► │ App le,         │
│ Briefing do      │    │ estruturado      │    │ faz upload no    │    │ valida, cria    │
│ cliente (PDF,    │    │ em markdown +    │    │ app              │    │ projeto +       │
│ DOCX ou texto)   │    │ JSON no bloco    │    │                  │    │ etapas + tarefas │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 1. Formato do documento gerado pela IA

A IA **deve** produzir um documento Markdown com **um bloco de código JSON bem definido** que o app consiga extrair de forma determinística.

### 1.1 Esquema JSON (contrato entre IA e app)

Bloco de código sempre identificado por `json-project-plan` para o app encontrar:

````markdown
```json-project-plan
{
  "version": "1.0",
  "generated_at": "2026-07-16T12:00:00Z",
  "project": {
    "name": "Campanha Verão 2025",
    "client_name": "Felipe Reis",
    "company_name": "Reis Burguer",
    "category_id": null,
    "category_name": "Vídeo",
    "priority": 2,
    "estimated_time": "40h",
    "deadline": "2026-08-30",
    "description": "Pacote de 6 vídeos para Reels com entrega semanal."
  },
  "stages": [
    {
      "name": "Briefing",
      "icon": "ClipboardList",
      "sla_days": 2,
      "deadline": "2026-07-25",
      "notes": "Alinhamento inicial com cliente via reunião de 1h.",
      "template_id": "video",
      "tasks": [
        {
          "title": "Reunião de alinhamento",
          "description": "Reunião de 1h para entender objetivos, público, referências.",
          "priority": 2,
          "status": "todo",
          "estimated_hours": 1,
          "actual_hours": 0,
          "deadline": "2026-07-18",
          "assigned_to_name": "Felipe Reis"
        },
        {
          "title": "Coletar referências visuais",
          "description": "Buscar e organizar moodboard de 10 referências.",
          "priority": 3,
          "status": "todo",
          "estimated_hours": 3,
          "actual_hours": 0,
          "deadline": "2026-07-20"
        }
      ]
    },
    {
      "name": "Roteiro",
      "icon": "FileText",
      "sla_days": 3,
      "deadline": "2026-07-30",
      "notes": "",
      "template_id": "video",
      "tasks": [
        {
          "title": "Roteiro do Vídeo 1",
          "priority": 2,
          "status": "todo",
          "estimated_hours": 4,
          "deadline": "2026-07-28"
        }
      ]
    }
  ]
}
```
````

### 1.2 Estrutura do documento Markdown completo

```markdown
# Plano de Projeto — Campanha Verão 2025

**Cliente:** Felipe Reis (Reis Burguer)  
**Data de início:** 2026-07-18  
**Data de entrega:** 2026-08-30  
**Duração total:** ~6 semanas  
**Complexidade:** Média (6 vídeos curtos)

## Resumo executivo
[2-3 parágrafos sobre escopo, objetivos, restrições e premissas]

## Cronograma
| Etapa     | Início    | Fim       | SLA (dias) |
|-----------|-----------|-----------|------------|
| Briefing  | 18/07/26  | 25/07/26  | 2          |
| Roteiro   | 26/07/26  | 30/07/26  | 3          |
| Captação  | 01/08/26  | 10/08/26  | 5          |
| Edição    | 11/08/26  | 25/08/26  | 4          |
| Entrega   | 28/08/26  | 30/08/26  | 1          |

## Premissas e decisões
- [lista de suposições que a IA fez ao gerar]

## Bloco para importação
[código json-project-plan acima]

```

### 1.3 Regras obrigatórias para a IA

| # | Regra | Por quê |
|---|---|---|
| R1 | Sempre usar bloco `json-project-plan` (não outros) | Parser procura por esse identificador |
| R2 | `version: "1.0"` sempre no topo | Compatibilidade futura |
| R3 | `project.name` obrigatório | Senão o app rejeita |
| R4 | Pelo menos 1 `stages` obrigatório | Plano vazio não faz sentido |
| R5 | Cada stage precisa de `name`, `order_index` (implícito pela posição), `sla_days` ou `deadline` | Sem isso, etapas ficam sem prazo |
| R6 | Datas em formato `YYYY-MM-DD` (ISO 8601) | Compatibilidade com Postgres/date |
| R7 | `priority` inteiro de 1 a 5 (1=Crítica, 5=Mínima) | Mesmo padrão do app |
| R8 | `assigned_to_name` (em vez de ID) — app resolve por nome | Mais robusto ao trocar banco |
| R9 | Não inventar campos extras não documentados | Parser ignora silenciosamente |
| R10 | `description` pode ser vazio/nulo, mas não omitir a chave | Mantém schema consistente |

### 1.4 Validação que o app faz ao receber

```
- version === "1.0"          → senão, rejeita com mensagem amigável
- project.name presente       → senão, erro
- stages.length >= 1         → senão, erro
- cada stage.name presente    → senão pula o stage com warning
- cada task com deadline válido → senão, salva sem prazo + warning
- assigned_to_name resolve para um collaborator existente → senão, fica null + warning
- category_name resolve      → senão, fica null + warning
```

---

## 2. Onde o usuário cola/faz upload

**Novo botão no header do `/pj/projetos`:** "📋 Importar Plano (IA)"

Abre um `Dialog` com 2 modos:

### Modo A — Colar markdown
```
┌──────────────────────────────────────────┐
│ Importar plano de projeto gerado por IA  │
├──────────────────────────────────────────┤
│  [Colar texto] [Fazer upload .md/.json]  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  textarea grande com placeholder    │  │
│  │  "Cole aqui o plano gerado pela    │  │
│  │  IA, ou arraste o arquivo .md..."  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [Cancelar]              [Validar →]     │
└──────────────────────────────────────────┘
```

### Modo B — Upload de arquivo
- Drag-and-drop de `.md` ou `.json`
- Mesmo textarea é preenchido automaticamente

### Após validar
Abre tela de preview mostrando:
```
┌─────────────────────────────────────────┐
│ Preview do plano                         │
├─────────────────────────────────────────┤
│ 📦 Projeto: Campanha Verão 2025         │
│   Cliente: Felipe Reis (Reis Burguer)    │
│   Prazo: 18/07/26 → 30/08/26            │
│   Prioridade: P2 · Alta                  │
│                                         │
│ 📂 5 etapas (15 tarefas)                 │
│   1. Briefing (2d, 18-25/07) — 3 tarefas  │
│   2. Roteiro (3d, 26-30/07) — 4 tarefas   │
│   ...                                   │
│                                         │
│ ⚠️ 2 avisos:                            │
│   - "Bruno Silva" não encontrado, tarefa fica sem responsável │
│   - Data de prazo da etapa 3 está antes do início da etapa 2 │
│                                         │
│  [Cancelar]  [Importar e criar projeto]   │
└─────────────────────────────────────────┘
```

---

## 3. O que o app faz ao clicar "Importar"

Sequência atômica (com rollback se algo falhar no meio):

```typescript
async function importPlan(plan: ProjectPlan): Promise<string> {
  // 1. Criar o projeto
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({ ...plan.project, workspace_id, is_corporate: true })
    .select().single();
  if (projErr) throw projErr;

  // 2. Criar as etapas em batch
  const stagesInsert = plan.stages.map((s, idx) => ({
    project_id: project.id,
    workspace_id,
    user_id,
    name: s.name,
    icon: s.icon ?? 'Layers',
    sla_days: s.sla_days,
    deadline: s.deadline,
    order_index: idx,
    notes: s.notes,
    template_id: s.template_id,
    status: 'todo',
  }));
  const { data: stages, error: stageErr } = await supabase
    .from('project_stages')
    .insert(stagesInsert).select();
  if (stageErr) throw stageErr;

  // 3. Criar as tarefas em batch, com stage_id resolvido
  const tasksInsert: any[] = [];
  plan.stages.forEach((s, idx) => {
    s.tasks.forEach(t => {
      tasksInsert.push({
        user_id,
        workspace_id,
        project_id: project.id,
        stage_id: stages[idx].id,
        title: t.title,
        description: t.description,
        priority: t.priority ?? 3,
        status: t.status ?? 'todo',
        deadline: t.deadline,
        estimated_hours: t.estimated_hours ?? 0,
        actual_hours: t.actual_hours ?? 0,
        assigned_to: resolveCollaboratorId(t.assigned_to_name),
      });
    });
  });
  const { error: taskErr } = await supabase
    .from('project_tasks')
    .insert(tasksInsert);
  if (taskErr) {
    // ROLLBACK: deletar projeto (que cascateia tarefas e etapas)
    await supabase.from('projects').delete().eq('id', project.id);
    throw taskErr;
  }

  return project.id; // navegar para /pj/projetos/<id>
}
```

---

## 4. Prompt modelo para a IA

Prompt que o usuário pode copiar/colar na IA junto do contrato:

````markdown
Você é um assistente de planejamento de projetos da [Nome da Empresa].

Analise o contrato/briefing do cliente abaixo e gere um plano de execução
completo usando EXATAMENTE o formato abaixo. Não pule nenhum campo. Use
datas plausíveis baseadas na data de hoje (HOJE) e nos prazos do contrato.

# Contexto
HOJE: 2026-07-16
EMPRESA: [Chapada Digital / sua empresa]
CLIENTE: [nome do cliente]
CONTRATO:
[cole aqui o texto do contrato, briefing ou resumo]

---

# Formato obrigatório de saída

Você DEVE produzir um documento Markdown com:

1. Resumo executivo (2-3 parágrafos)
2. Cronograma em tabela
3. Premissas e decisões
4. Bloco de código JSON no formato abaixo (use EXATAMENTE o identifier
   `json-project-plan` para o app reconhecer)

```json-project-plan
{
  "version": "1.0",
  "generated_at": "ISO8601",
  "project": { ... },
  "stages": [
    {
      "name": "...",
      "icon": "...",
      "sla_days": N,
      "deadline": "YYYY-MM-DD",
      "notes": "...",
      "template_id": "video|design|motion|outros",
      "tasks": [
        {
          "title": "...",
          "description": "...",
          "priority": 1|2|3|4|5,
          "status": "todo|in_progress|done",
          "estimated_hours": N,
          "actual_hours": 0,
          "deadline": "YYYY-MM-DD",
          "assigned_to_name": "Nome do Colaborador (igual ao cadastro)"
        }
      ]
    }
  ]
}
```

Lembre-se:
- 1=Crítica, 2=Alta, 3=Média, 4=Baixa, 5=Mínima
- Datas em YYYY-MM-DD
- Para ícones de etapa use: ClipboardList, Search, FileText, Film,
  Palette, Scissors, Video, Sparkles, RefreshCw, Package, PlayCircle
- Entregue datas realistas considerando o SLA de cada etapa
- Stages devem ter pelo menos 1 tarefa cada
- Se faltar info, faça premissa explícita e registre em "Premissas"
````

---

## 5. Implementação no app (passos)

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `src/lib/planImporter.ts` | Funções: `parsePlanDocument(text)` (extrai JSON do markdown), `validatePlan(json)`, `importPlan(plan, workspace_id, user_id, collaborators, categories)` |
| 2 | `src/components/areapj/projetos/ImportPlanDialog.tsx` | Dialog com 2 modos (colar/upload), preview antes de importar, botão "Importar" |
| 3 | `src/pages/PJ/ProjetosClientesPage.tsx` | Botão "Importar Plano (IA)" no header que abre o dialog, ao finalizar navega para `/pj/projetos/<id>` |
| 4 | `docs/templates/prompt-planejamento.md` | Template do prompt para colar na IA |
| 5 | `docs/templates/plano-exemplo.md` | Plano de exemplo completo (gerado pela IA) para o usuário ver o output esperado |

Tempo estimado: ~3-4 horas de implementação.

---

## 6. Edge cases a tratar

| Caso | Comportamento |
|---|---|
| Markdown sem bloco `json-project-plan` | Dialog mostra: "Não encontrei o bloco de plano. Verifique se usou o identificador `json-project-plan`." |
| Versão diferente de `1.0` | Dialog mostra: "Este plano é da versão X.Y. O app aceita 1.0. Atualize a IA ou ajuste manualmente." |
| Mais de 1 bloco JSON no texto | Usa o **primeiro** que tenha o identifier correto |
| Colaborador citado não existe | Warning no preview + tarefa fica sem responsável |
| Categoria citada não existe | Warning no preview + projeto fica sem categoria |
| Data no passado | Warning no preview + ainda assim cria (gestor pode corrigir) |
| Data de etapa anterior à data da etapa anterior | Warning "Sequência de datas suspeita" no preview |
| Muitas tarefas (>200) | Dialog mostra contagem e pede confirmação |
| Falha no meio da importação | Rollback automático (deleta projeto criado + cascateia) + toast de erro |

---

## 7. Próximas evoluções (depois que funcionar)

- **Histórico de planos** — manter as últimas N importações para auditoria
- **Refinar com IA** — após importar, chamar IA para sugerir ajustes finos
- **Re-importar** — sobrescrever projeto existente a partir de novo plano
- **Templates de plano por categoria** — salvar plano "Vídeo padrão" como template reutilizável
- **Webhook para n8n** — quando contrato chega por email, gerar plano automaticamente
