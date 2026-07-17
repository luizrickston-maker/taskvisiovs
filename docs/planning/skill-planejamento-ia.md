# Skill — Planejamento de Projeto a partir de Documento do Cliente

Esta skill recebe um documento de entrada (contrato, briefing, transcrição,
e-mail ou especificação) e produz um plano de execução estruturado pronto
para ser importado no TaskVision Pro (módulo Projetos PJ).

---

## 1. Forma de entrada

O usuário fornece um documento de entrada em um destes formatos:

- PDF (texto extraído)
- DOCX / RTF (texto)
- Markdown / TXT puro
- Colagem direta no chat
- URL de arquivo no Drive
- Múltiplos documentos combinados

**Tolerância a entrada ruidosa:** a skill deve funcionar com informações parciais.
Se faltar prazo, deadline do cliente, brief criativo ou valores, registre em
**Premissas** no output e use defaults razoáveis:

| Campo faltante | Default |
|---|---|
| Categoria | Inferir pelo nome (Vídeo / Design / Motion / Outros) |
| Prioridade | P3 (Média) |
| SLA por etapa | Tabela padrão do template correspondente |
| Deadline | Distribuir proporcionalmente aos SLAs |
| Colaborador | `null` se não encontrar nos ativos da workspace |

Se o documento for ambíguo ou faltarem dados críticos, liste as perguntas
no início do plano (seção **Perguntas em aberto**) e continue produzindo o
melhor plano possível com o que tem.

---

## 2. Cálculo de datas e capacidade interna

### 2.1 Calendário de trabalho (CAPACIDADE INTERNA)

A equipe trabalha EXCLUSIVAMENTE nestes dias e horários:

| Dia         | Horário        | Horas úteis |
|-------------|----------------|-------------|
| Segunda     | 09:00 — 19:00  | 10h         |
| Terça       | 09:00 — 19:00  | 10h         |
| Quarta      | 09:00 — 19:00  | 10h         |
| Quinta      | 09:00 — 19:00  | 10h         |
| Sexta       | 09:00 — 12:00  | 3h          |
| Sábado      | —              | 0h          |
| Domingo     | —              | 0h          |

**Total semanal (1 pessoa): 43 horas úteis.**

ATENÇÃO: este calendário é INTERNO da execução. NÃO reflete o que o cliente
pediu (eventualmente o cliente pode pedir algo numa sexta à tarde ou num fim
de semana para uma campanha urgente). Use o calendário interno APENAS para
garantir que o time consiga entregar no prazo TRABALHANDO dentro do horário e
dia determinados. Se o cliente pedir algo fora, registrar em "Premissas"
como exceção e ajustar.

### 2.2 Funções utilitárias (simular mentalmente)

```
HORAS_POR_DIA = { 1: 10, 2: 10, 3: 10, 4: 10, 5: 3, 6: 0, 0: 0 }
# JavaScript Date.getDay(): 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab, 0=dom

nextBusinessDay(date):
  - sábado ou domingo → próxima segunda
  - sexta antes das 12h → próprio dia
  - sexta após 12h, ou sábado, ou domingo → próxima segunda
  - caso contrário → date (próprio dia)

isWorkDay(date): retorna true se Mon-Thu ou Sex antes das 12h
workingHoursInRange(start, end):
  soma HORAS_POR_DIA apenas nos dias úteis entre start e end
```

### 2.3 Validação de factibilidade (RODAR ANTES DE RETORNAR O PLANO)

Para cada projeto gerado:

1. Calcular **ΣH** = soma de todas as `tasks[i].estimated_hours`
2. Calcular **Hdisp** = `workingHoursInRange(HOJE, deadline do projeto)` (descontar sextas-parcial, sábados e domingos)
3. Aplicar a regra:

| Condição | Resultado |
|---|---|
| ΣH ≤ Hdisp | factível, `factibility_note: "OK, folga de Xh no cronograma."` |
| ΣH > Hdisp em até 20% | factível com alerta, `factibility_note: "Apertado: faltam Yh. Considere redistribuir ou usar horas extras."` |
| ΣH > Hdisp em mais de 20% | NÃO factível, registrar em Premissas: "Para entregar em D, precisaríamos de Nh úteis mas só temos Hh disponíveis. Recomendação: estender prazo OU adicionar colaborador OU reduzir escopo." |

Se a IA detectar que a duração interna necessária é maior que o prazo do
cliente, AINDA ASSIM produzir o plano (com aviso claro nas Premissas).
O gestor decidirá como resolver.

### 2.4 Regra de Ancoragem de Datas

**Caminho preferido:** backward-planning a partir do deadline do cliente.

```
se contract_deadline existe:
    stages[N-1].deadline = contract_deadline
    stages[N-2].deadline = stages[N-1].deadline - sla_stages[N-1]
    ...
    stages[0].deadline = stages[1].deadline - sla_stages[0]
    # ajuste para não cair em fim de semana/sexta-tarde:
    snapToWorkDay(stages[i].deadline) → se cair em sab/dom/sex-tarde,
                                       ajustar para próximo dia útil

regra de cronologia crescente:
    stages[i].deadline >= stages[i-1].deadline + 1 dia útil
```

Se não houver deadline explícito, ancorar pelo **HOJE + soma dos SLAs**:

```
    stages[0].deadline = nextBusinessDay(HOJE) + sla_stages[0] dias úteis
    stages[i].deadline = stages[i-1].deadline + sla_stages[i] dias úteis
```

### 2.5 Distribuição de Tarefas Dentro da Etapa

Cada etapa tem um intervalo de execução:

```
intervalo_etapa[i] = [stages[i-1].deadline + 1 dia útil, stages[i].deadline]
```

Tarefas dentro do intervalo são agendadas em dias úteis específicos:

- Ordenar tarefas por prioridade (P1 → P5), depois por deadline
- Cada dia útil tem capacidade `HORAS_POR_DIA[dia_semana]`
- Alocar a tarefa ao primeiro dia com capacidade restante ≥ `estimated_hours`
- Se uma tarefa só cabe "quebrada" entre dias: registrar nas Premissas,
  mas **NÃO dividir a tarefa** — manter a tarefa inteira num único dia
  e marcar "Sobrecarga" no preview do app

### 2.6 Capacidade por Colaborador

Se várias tarefas têm assignees diferentes:

- Somar horas POR PESSOA separadamente
- Cada pessoa tem capacidade de **43h/semana**
- Capacidade efetiva do projeto = `min(capacidade_pessoas_disponíveis)`
- Se apenas um responsável central for declarado: usar a capacidade dele

### 2.7 Formato de Datas nas Tasks

Datas em ISO 8601 **sem hora**: `"YYYY-MM-DD"` (ex.: `"2026-07-25"`).

NÃO incluir horário nas tasks. NÃO usar "amanhã", "próxima semana",
"em X dias" — sempre converter para data absoluta.

A alocação ao longo do dia (manhã/tarde) é decisão do gestor humano,
não da IA.

---

## 3. Escopo do plano

### 3.1 DENTRO do escopo (gerar sempre)

1. **Projeto (nível 1)**: nome, cliente, empresa, categoria inferida,
   prioridade, prazo final, descrição curta do escopo.
2. **Etapas (nível 2)**: lista ordenada de fases. Cada uma com nome,
   descrição curta (1 linha), prazo início/fim, SLA em dias, notas opcionais.
3. **Tarefas (nível 3)**: tarefas concretas, acionáveis, por etapa. Cada uma
   com título imperativo, descrição curta, prioridade, prazo, horas estimadas.
4. **Cronograma em tabela**: resumo visual de etapas + datas.
5. **Resumo executivo**: 2-3 parágrafos sobre escopo, objetivos, restrições.
6. **Premissas e decisões**: tudo que a IA inferiu / assumiu / escolheu.
7. **Perguntas em aberto** (se houver): dúvidas importantes para o gestor
   responder antes de executar.
8. **`work_calendar`** dentro do JSON: sempre incluir, mostrando factibilidade
   e capacidade.

### 3.2 Quantidade típica

- **4-7 etapas** (mínimo 3, máximo 8)
- **3-15 tarefas por etapa** (mínimo 1 cada)
- **Total entre 15 e 60 tarefas no projeto**

### 3.3 OUTRO do escopo (NÃO gerar)

- Atribuição de preço / orçamento / cobrança / NF / financeiro
- Estratégia de marketing do projeto
- Scripts de copy / roteiros criativos detalhados (apenas estrutura de etapas)
- Tarefas internas de gestão (reuniões de equipe, dailys) — só gerar se o
  usuário pedir explicitamente
- Comentários, anexos, briefings visuais detalhados
- Configuração de equipe / contratação
- Cronograma de cobrança / pagamentos

Se o documento de entrada pedir explicitamente algo fora do escopo, incluir
como seção **"Extras solicitados"** ao final, sem usar a estrutura padrão.

### 3.4 Capacidade de execução no escopo

Cada plano gerado DEVE vir com `work_calendar` indicando factibilidade,
porque o TaskVision Pro tem horário de execução interno
(Seg-Sex 9-19, Sex só até 12h) que limita a **43h semanais por colaborador**.
Planos acima dessa capacidade precisam ser sinalizados para o gestor decidir
se:

- Estende o prazo
- Adiciona colaborador
- Reduz escopo

A IA pode sugerir essas alternativas em "Premissas", mas **NÃO toma a
decisão** — apenas apresenta o cenário.

### 3.5 Granularidade das tarefas

Cada tarefa deve ser:

- Acionável por uma única pessoa
- Concluível em 0.5 a 8 horas
- Sem ambiguidade — não usar "finalizar projeto" mas sim "entregar versão 3
  do vídeo para aprovação do cliente"

---

## 4. Saída esperada (formato e schema)

A saída é um **documento Markdown** com:

1. Resumo executivo (2-3 parágrafos)
2. Cronograma em tabela Markdown
3. Premissas e decisões
4. Perguntas em aberto (se houver)
5. Bloco de código JSON identificado por `json-project-plan`

### 4.1 Schema JSON (versão 1.0)

```json
{
  "version": "1.0",
  "generated_at": "ISO8601",
  "work_calendar": {
    "first_work_day": "YYYY-MM-DD",
    "project_end_day": "YYYY-MM-DD",
    "estimated_effort_hours": 0,
    "available_capacity_hours": 0,
    "weekly_capacity_per_person_hours": 43,
    "feasible": true,
    "feasibility_note": "string — vazia se factível, descrição do problema caso contrário"
  },
  "project": {
    "name": "string",
    "client_name": "string",
    "company_name": "string|null",
    "category_name": "Vídeo|Design|Motion|Outros",
    "priority": 1,
    "estimated_time": "string|null",
    "deadline": "YYYY-MM-DD",
    "description": "string"
  },
  "stages": [
    {
      "name": "string",
      "icon": "ClipboardList|FileText|Video|Scissors|Package|Search|Palette|RefreshCw|Film|Sparkles|PlayCircle|Layers",
      "sla_days": 0,
      "deadline": "YYYY-MM-DD",
      "notes": "string",
      "template_id": "video|design|motion|outros",
      "tasks": [
        {
          "title": "string (verbo no imperativo)",
          "description": "string",
          "priority": 3,
          "status": "todo",
          "estimated_hours": 0,
          "actual_hours": 0,
          "deadline": "YYYY-MM-DD",
          "assigned_to_name": "string|null (nome exato de um colaborador cadastrado)"
        }
      ]
    }
  ]
}
```

### 4.2 Regras obrigatórias do JSON

- Sempre usar o identifier `json-project-plan` no bloco de código
- Incluir `version: "1.0"` no topo
- Datas em `YYYY-MM-DD`
- Tarefas dentro de uma etapa respeitam o deadline da etapa
- Não inventar campos extras além dos documentados acima
- Pelo menos 1 tarefa por etapa
- Cada ícone deve ser um nome válido do lucide-react
- `work_calendar` é **obrigatório** em todos os planos
- `factibility_note` se vazio: plano ok. Se preenchido: indica problema

---

## 5. Onde persistir

O plano gerado é persistido no **módulo Projetos (PJ)** do TaskVision Pro:

1. **Projeto** → tabela `projects` (`is_corporate=true`, `workspace_id=<atual>`)
2. **Etapas** → tabela `project_stages` (FK `project_id`, ordem via `order_index`)
3. **Tarefas** → tabela `project_tasks` (FK `project_id` e `stage_id`, status=`todo`)

### Fluxo de persistência

- Usuário cola o markdown no dialog **"Importar Plano (IA)"** do `/pj/projetos`
- App extrai o bloco `json-project-plan` via regex
- Valida campos obrigatórios (version, project.name, stages.length≥1, work_calendar presente)
- Mostra preview com avisos (colaborador inexistente, datas no passado, etc.)
- Usuário clica **"Importar"** → bulk INSERT em transação com rollback
- Navega para `/pj/projetos/<id>` e mostra o projeto criado

O usuário pode também copiar manualmente o bloco JSON do markdown para outros
usos (outras ferramentas, planilhas, etc).

---

## 6. Premissas — defaults e inferências

Quando faltar informação, aplicar nesta ordem:

| Campo | Regra |
|---|---|
| Categoria | Inferir pelo nome (case-insensitive): contém "vídeo/reels/shorts/story" → Vídeo; contém "design/arte/grid/capa/thumb/social" → Design; contém "motion/animação/3d" → Motion; senão → Outros |
| Template | igual à categoria inferida |
| Prioridade | P3 (Média); upgrade para P2 se prazo < 2 semanas; P1 se prazo < 1 semana |
| SLA por etapa | Tabela padrão do template (Vídeo: Briefing 2d, Roteiro 3d, Captação 5d, Edição 4d, Entrega 1d) |
| Deadline do projeto | Se cliente deu deadline explícito, usar. Senão: HOJE + soma(SLAs) + folga de 1 dia útil a cada 3 etapas |
| Colaborador | Tentar mapear pelo nome nos "colaboradores ativos" da workspace (mesmo nome OU nome contendo OU email); se não achar, deixar null + marcar como aviso no preview |
| Categoria do projeto | Se categoria_name citada não bate com nenhuma cadastrada, deixar null + avisar |

Sempre documentar em "Premissas" toda escolha que foi inferida em vez de
declarada pelo usuário.

---

## 7. Validação (antes de retornar)

Antes de finalizar o plano, validar internamente:

- `version === "1.0"`
- `project.name` presente e não vazio
- `stages.length >= 1`
- Cada stage tem `name` e (`sla_days > 0` ou `deadline` válido)
- Cada task tem `title` e (recomendado) `deadline` válido
- Datas em formato ISO `YYYY-MM-DD`
- Cronologia: `stages[i].deadline > stages[i-1].deadline`
- `work_calendar.estimated_effort_hours` ≥ 0
- `work_calendar.feasible` reflete a análise de factibilidade da seção 2.3
- Nenhuma data de tarefa anterior ao `first_work_day` do plano

Se algum desses falhar:

- **Erro crítico** (version, projeto.name, sem stages): gerar erro estruturado
  com mensagem amigável para o usuário, listando o que falta.
- **Aviso recuperável** (categoria inexistente, colaborador não mapeado,
  data no passado): incluir em "Premissas" e prosseguir.

---

## 8. Exemplos

### 8.1 Exemplo mínimo de bloco JSON válido

```json-project-plan
{
  "version": "1.0",
  "generated_at": "2026-07-16T12:00:00Z",
  "work_calendar": {
    "first_work_day": "2026-07-20",
    "project_end_day": "2026-08-12",
    "estimated_effort_hours": 76,
    "available_capacity_hours": 86,
    "weekly_capacity_per_person_hours": 43,
    "feasible": true,
    "feasibility_note": "OK, folga de 10h no cronograma."
  },
  "project": {
    "name": "Campanha Verão 2025",
    "client_name": "Felipe Reis",
    "company_name": "Reis Burguer",
    "category_name": "Vídeo",
    "priority": 2,
    "estimated_time": "40h",
    "deadline": "2026-08-12",
    "description": "Pacote de 6 vídeos para Reels com entrega semanal."
  },
  "stages": [
    {
      "name": "Briefing",
      "icon": "ClipboardList",
      "sla_days": 2,
      "deadline": "2026-07-22",
      "notes": "Alinhamento inicial via reunião de 1h.",
      "template_id": "video",
      "tasks": [
        {
          "title": "Reunião de alinhamento",
          "description": "Reunião de 1h para entender objetivos e público.",
          "priority": 2,
          "status": "todo",
          "estimated_hours": 1,
          "actual_hours": 0,
          "deadline": "2026-07-20",
          "assigned_to_name": "Felipe Reis"
        },
        {
          "title": "Coletar referências visuais",
          "description": "Buscar e organizar moodboard de 10 referências.",
          "priority": 3,
          "status": "todo",
          "estimated_hours": 3,
          "actual_hours": 0,
          "deadline": "2026-07-22"
        }
      ]
    }
  ]
}
```

### 8.2 Estrutura completa do documento Markdown

```markdown
# Plano de Projeto — Campanha Verão 2025

**Cliente:** Felipe Reis (Reis Burguer)
**Início:** 2026-07-20 (segunda)
**Entrega:** 2026-08-12 (terça)
**Carga estimada:** 76h úteis / 86h disponíveis = ✅ factível (folga 10h)

## Resumo executivo
[2-3 parágrafos sobre escopo, objetivos, restrições]

## Cronograma
| Etapa    | Início    | Fim       | SLA | Horas estimada |
|----------|-----------|-----------|-----|----------------|
| Briefing | 20/07/26  | 22/07/26  | 2d  | 8h             |
| Roteiro  | 23/07/26  | 27/07/26  | 3d  | 18h            |
| ...      |           |           |     |                |

## Premissas e decisões
- Categoria inferida como "Vídeo" pelo nome do contrato
- Deadline do projeto baixado de 15/08 para 12/08 para caber nas 43h/sem
- ...

## Perguntas em aberto
- Quantos vídeos realmente? (contrato diz "pacote", não especificou número)

## Para importação no app

```json-project-plan
[bloco JSON aqui]
```
```

---

## 9. Regras finais (resumo)

- Sempre produzir o Markdown + bloco JSON `json-project-plan`
- SEMPRE incluir `work_calendar`
- Datas em `YYYY-MM-DD`
- Não inventar campos extras
- Se o cliente pedir algo fora do escopo (sábado, sexta à tarde), registrar
  em "Premissas" em vez de recusar
- Se factibilidade for comprometida, sinalizar; nunca esconder do gestor
- Tom profissional e direto, sem floreios
- Lembre-se: o time trabalha Seg-Sex 9-19 (Sex só até 12h); respeitar 43h/semana por pessoa 
- atualmente trabalham 2 pessoas, o dono e + 1 colaborador
