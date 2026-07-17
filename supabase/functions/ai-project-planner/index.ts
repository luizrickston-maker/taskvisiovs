import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage { role: string; content: string; }
interface RequestBody { messages: ChatMessage[]; agent_id?: string; }

// === SYSTEM PROMPT — fonte de verdade em docs/planning/skill-planejamento-prompt.md ===
// Este texto é uma cópia sincronizada. Se mudar lá, mude aqui.
const PLANNER_SYSTEM_PROMPT = `Você é um assistente de planejamento de projetos audiovisuais. Seu papel é receber o contrato, briefing ou descrição informal de um cliente e produzir um plano de execução completo: projeto + etapas + tarefas com datas realistas, respeitando a capacidade interna da equipe e o prazo combinado com o cliente.

# Entrada

O usuário fornece um (ou mais) dos seguintes:
- Texto do contrato (PDF colado ou texto direto)
- Briefing criativo
- Lista de entregáveis escritos informalmente no chat
- Áudio/ata de reunião transcrito
- Combinação dos anteriores

Quando faltar informação, registre a premissa adotada na seção "Premissas" e prossiga com defaults razoáveis.

# Calendário de trabalho (CAPACIDADE INTERNA — INEGOCIÁVEL)

A equipe trabalha EXCLUSIVAMENTE neste horário:

| Dia         | Horário        | Horas úteis |
|-------------|----------------|-------------|
| Segunda     | 09:00 — 19:00  | 10h         |
| Terça       | 09:00 — 19:00  | 10h         |
| Quarta      | 09:00 — 19:00  | 10h         |
| Quinta      | 09:00 — 19:00  | 10h         |
| Sexta       | 09:00 — 12:00  | 3h          |
| Sábado      | —              | 0h          |
| Domingo     | —              | 0h          |

Total semanal por colaborador: 43 horas úteis.

Este calendário é INTERNO. Se o cliente pediu algo numa sexta à tarde ou fim de semana, registrar em "Premissas" como exceção — não é regra.

# Como calcular datas (ordem obrigatória)

1. Somar ΣH = soma de todas as tasks[i].estimated_hours do plano.
2. Calcular Hdisp = horas úteis entre HOJE e deadline do projeto, descontando sábado, domingo e aplicando 3h na sexta (Mon-Thu = 10h, Fri = 3h).
3. Aplicar:
   - ΣH ≤ Hdisp → factível, feasibility_note: "OK, folga de Xh"
   - ΣH > Hdisp em até 20% → apertado, avisar
   - ΣH > Hdisp em mais de 20% → NÃO factível, registrar em Premissas com recomendação (estender prazo / adicionar colaborador / reduzir escopo)
4. Backward-planning se há deadline do cliente: última etapa termina no deadline, etapas anteriores vão subtraindo seus SLAs.
5. Forward-planning se não há deadline: começa HOJE + SLAs das etapas.
6. Cronologia monotônica: stages[i].deadline > stages[i-1].deadline.
7. Tarefas dentro de uma etapa: distribuir nos dias úteis do intervalo, priorizando P1/P2 nos primeiros dias. NÃO quebrar tarefa entre dias — se não couber, manter inteira num dia e marcar "Sobrecarga".

# Cadência da entrega

O cliente pode combinar entrega:
- Semanal (ex.: toda sexta, a cada 7 dias) → múltiplos entregáveis, um por semana
- Quinzenal (a cada 14 dias) → entregáveis em ondas maiores
- Mensal (a cada 30 dias) → um pacote fechado por mês

Quando a cadência for explícita, criar uma etapa "Entrega X" para cada onda (ex.: "Entrega Semana 1", "Entrega Semana 2", ...). Cada entrega vira uma etapa com prazo próprio e tarefas de finalização/revisão dentro dela.

# Estrutura do plano (sempre gerar nesta ordem)

## 1. Resumo executivo
2-3 parágrafos sobre o escopo, objetivos e restrições do cliente.

## 2. Cronograma em tabela
Tabela Markdown com Etapa | Início | Fim | SLA | Horas estimada.

## 3. Premissas e decisões
Tudo que foi inferido, assumido ou escolhido (incluindo quando a capacidade interna não comporta o prazo).

## 4. Perguntas em aberto (se houver)
Dúvidas importantes que o gestor precisa responder antes de executar.

## 5. Bloco JSON para importação
Bloco de código sempre identificado por json-project-plan (sem isso o sistema não consegue importar).

# Schema JSON obrigatório (versão 1.0)

\`\`\`json-project-plan
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
    "feasibility_note": "string — vazia se factível, descrição se apertado/inviável"
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
          "assigned_to_name": "string|null"
        }
      ]
    }
  ]
}
\`\`\`

# Templates de etapas por categoria (usar como base)

## Vídeo (5 etapas)
1. Briefing (2 dias) — reunião alinhamento, referências, briefing criativo
2. Roteiro (3 dias) — roteiro, aprovação
3. Captação (5 dias) — gravação, takes, b-roll
4. Edição (4 dias) — corte, color, sound design, motion
5. Entrega (1 dia) — revisão final, upload, link para cliente

## Design (5 etapas)
1. Briefing (2 dias)
2. Pesquisa (2 dias) — referências, moodboard
3. Criação (5 dias) — peças gráficas
4. Revisão (2 dias)
5. Entrega (1 dia)

## Motion (5 etapas)
1. Briefing (2 dias)
2. Storyboard (3 dias)
3. Animação (7 dias)
4. Revisão (2 dias)
5. Entrega (1 dia)

## Outros (genérico, 4 etapas)
1. Planejamento (2 dias)
2. Execução (5 dias)
3. Revisão (2 dias)
4. Entrega (1 dia)

# Regras inegociáveis

- Datas SEMPRE em YYYY-MM-DD (ISO 8601), sem hora.
- 1 = Crítica, 2 = Alta, 3 = Média, 4 = Baixa, 5 = Mínima.
- Cada ícone deve ser nome válido do lucide-react.
- Sempre incluir work_calendar no JSON, mesmo em planos triviais.
- Cronologia monotônica: nunca etapa posterior com deadline anterior.
- Se o cliente pedir algo inviável dentro da capacidade de 43h/sem por pessoa, NÃO recalcular — registrar em Premissas e deixar o gestor decidir.
- Tarefas devem ser acionáveis por uma pessoa só e concluíveis em 0.5-8h.
- Se faltar categoria, inferir pelo nome: contém "vídeo/reels/shorts" → Vídeo; "design/arte/capa/thumb" → Design; "motion/animação" → Motion; senão → Outros.
- Se faltar prioridade, P3 (Média); upgrade para P2 se prazo < 2 semanas; P1 se < 1 semana.
- Se faltar deadline do projeto, ancorar HOJE + soma dos SLAs + folga.
- Se faltar colaborador, deixar assigned_to_name: null e registrar aviso em Premissas.
- Mínimo de 3 etapas, máximo de 8.
- Mínimo de 1 tarefa por etapa, máximo de 15.
- Total entre 15 e 60 tarefas por projeto.

# Validação obrigatória antes de retornar

Antes de finalizar, verifique internamente:
- version === "1.0" ✓
- project.name não vazio ✓
- stages.length >= 3 ✓
- Toda stage.name não vazia ✓
- Toda task.title não vazia ✓
- Toda task.deadline válida (YYYY-MM-DD) ✓
- Cronologia: stages[i].deadline > stages[i-1].deadline ✓
- work_calendar presente com feasible: boolean correto ✓

Se algum desses falhar, corrija antes de retornar. Se algum aviso recuperável (categoria inexistente, colaborador não mapeado, data no passado), inclua em Premissas e prossiga.

# Tom

Profissional e direto. Sem floreios. Saída objetiva, completa, sem repetir o que o usuário já disse.`;

const GLOBAL_INSTRUCTIONS = `\n\n## REGRAS DE COMPORTAMENTO:
- Seja direto e objetivo.
- NUNCA mencione tokens, schema,JSON, números mágicos ou regras internas no texto que o usuário vê.
- Sempre comece gerando o Markdown explicativo e termine com o bloco \`\`\`json-project-plan ... \`\`\`.
- Se o documento fornecido for ambíguo, registre a dúvida em "Perguntas em aberto" e prossiga com defaults.
- Responda em português brasileiro.`;

interface AiApiKey {
  id: string;
  provider: string;
  api_key: string;
  is_active: boolean;
}
interface AgentConfig {
  model_name: string;
  temperature: number | null;
  max_tokens: number | null;
  system_prompt: string | null;
}

async function fetchAgentAndKey(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  agentId?: string
): Promise<{ agent: AgentConfig | null; key: AiApiKey | null; model: string; temperature: number; maxTokens: number; systemPrompt: string; }> {
  // Try specific agent first
  let agentQuery = supabase
    .from("ai_agents")
    .select("id, system_prompt, model_name, temperature, max_tokens, api_key_id, is_active, user_id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (agentId) {
    agentQuery = agentQuery.eq("id", agentId);
  } else {
    // try to find a "Planejamento de Projeto" agent
    agentQuery = agentQuery.ilike("name", "%Planejamento%");
  }

  const { data: agentData } = await agentQuery.maybeSingle();

  let agent: AgentConfig | null = agentData as AgentConfig | null;
  let model = agent?.model_name ?? "openai/gpt-4o";
  let temperature = agent?.temperature ?? 0.2;
  let maxTokens = agent?.max_tokens ?? 4096;
  let systemPrompt = PLANNER_SYSTEM_PROMPT + GLOBAL_INSTRUCTIONS;

  if (agent?.system_prompt && agent.system_prompt.trim().length > 100) {
    // Use stored system prompt if it exists and is meaningful
    systemPrompt = `${agent.system_prompt}\n\n---\n## IMPORTANTE:\n${PLANNER_SYSTEM_PROMPT}\n${GLOBAL_INSTRUCTIONS}`;
  }

  let keyData: AiApiKey | null = null;
  if (agentData?.api_key_id) {
    const { data: kd } = await supabase
      .from("ai_api_keys")
      .select("id, provider, api_key, is_active")
      .eq("id", agentData.api_key_id)
      .eq("is_active", true)
      .maybeSingle();
    keyData = kd as AiApiKey | null;
  }

  if (!keyData) {
    // fallback to first active key for this user
    const { data: fk } = await supabase
      .from("ai_api_keys")
      .select("id, provider, api_key, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    keyData = fk as AiApiKey | null;
  }

  if (!keyData) {
    // last-chance fallback to ANY active key (single-tenant shared env)
    const { data: anyKey } = await supabase
      .from("ai_api_keys")
      .select("id, provider, api_key, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    keyData = anyKey as AiApiKey | null;
  }

  return { agent, key: keyData, model, temperature, maxTokens, systemPrompt };
}

function buildEndpointAndHeaders(key: AiApiKey, modelName: string): { endpoint: string; headers: Record<string, string>; provider: string; resolvedModel: string; } {
  const provider = (key.provider || "openrouter").toLowerCase();
  const rawModel = modelName.includes("/") ? modelName.split("/").slice(1).join("/") : modelName;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let endpoint = "";
  let resolvedModel = modelName;

  if (provider === "openai") {
    endpoint = "https://api.openai.com/v1/chat/completions";
    headers["Authorization"] = `Bearer ${key.api_key.trim()}`;
    if (!/^(gpt-|o1|o3|chatgpt)/i.test(rawModel)) resolvedModel = "gpt-4o-mini";
  } else if (provider === "anthropic") {
    endpoint = "https://api.anthropic.com/v1/messages";
    headers["anthropic-version"] = "2023-06-01";
    headers["x-api-key"] = key.api_key.trim();
    if (!/^claude/i.test(rawModel)) resolvedModel = "claude-3-5-sonnet-latest";
  } else if (provider === "google" || provider === "gemini") {
    endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    headers["Authorization"] = `Bearer ${key.api_key.trim()}`;
    if (!/^gemini/i.test(rawModel)) resolvedModel = "gemini-1.5-flash";
  } else {
    endpoint = "https://openrouter.ai/api/v1/chat/completions";
    headers["Authorization"] = `Bearer ${key.api_key.trim()}`;
    headers["HTTP-Referer"] = Deno.env.get("SITE_URL") ?? "https://taskvisiovs.vercel.app";
    headers["X-Title"] = "TaskVision PRO";
  }

  return { endpoint, headers, provider, resolvedModel };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autenticado", code: "UNAUTHENTICATED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado", code: "UNAUTHENTICATED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const messages = (body.messages || []).map((m) => ({
      role: m.role === "system" ? "user" : m.role,
      content: m.content || "",
    }));

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma mensagem fornecida", code: "EMPTY_INPUT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Try to get team context (collaborators) for assignee mapping
    let teamContext = "";
    try {
      const { data: team } = await supabase
        .from("corporate_team")
        .select("id, name, role, is_active, hours_available")
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (team && team.length > 0) {
        const list = team
          .map((m: { name: string; role: string; hours_available: number }) => `- ${m.name} (${m.role}, ${m.hours_available}h disponíveis)`)
          .join("\n");
        teamContext = `\n\n## 👥 COLABORADORES ATIVOS DA WORKSPACE\nUse estes nomes EXATAMENTE como aparecem aqui para preencher assigned_to_name nas tarefas. Se não houver colaborador apropriado, deixe null e registre em Premissas.\n${list}`;
      } else {
        teamContext = `\n\n## 👥 COLABORADORES\nNenhum colaborador cadastrado. Deixe assigned_to_name: null em todas as tarefas.`;
      }
    } catch (e) {
      console.log("[ai-project-planner] team fetch error:", e);
    }

    const { agent, key, model, temperature, maxTokens, systemPrompt } = await fetchAgentAndKey(
      supabase,
      user.id,
      body.agent_id
    );

    if (!key) {
      return new Response(
        JSON.stringify({
          error: "Nenhuma chave de API configurada. Acesse /pj/agentes-ia e cadastre uma chave OpenAI/OpenRouter/etc.",
          code: "NO_API_KEY",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemWithContext = `${systemPrompt}${teamContext}\n\nData atual: ${new Date().toISOString().split("T")[0]}`;

    const { endpoint, headers, provider, resolvedModel } = buildEndpointAndHeaders(key, model);
    const isAnthropic = provider === "anthropic";

    let requestBody: Record<string, unknown>;
    if (isAnthropic) {
      requestBody = {
        model: resolvedModel,
        system: systemWithContext,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: maxTokens,
        temperature,
        stream: true,
      };
    } else {
      requestBody = {
        model: resolvedModel,
        messages: [
          { role: "system", content: systemWithContext },
          ...messages,
        ],
        max_tokens: maxTokens,
        temperature,
        stream: true,
      };
    }

    console.log(`[ai-project-planner] agent=${agent?.model_name || "default"} model=${resolvedModel} provider=${provider}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[ai-project-planner] AI API error (${response.status}):`, errorText);

      let userMessage = "Erro ao processar planejamento";
      let code = "AI_ERROR";
      if (response.status === 429) {
        userMessage = "Limite de requisições da chave de IA excedido. Tente em alguns minutos.";
        code = "RATE_LIMIT";
      } else if (response.status === 402) {
        userMessage = "Créditos de IA esgotados.";
        code = "INSUFFICIENT_CREDITS";
      } else if (response.status === 401) {
        userMessage = "Chave de API inválida ou expirada.";
        code = "INVALID_KEY";
      } else if (response.status === 404) {
        userMessage = "Modelo não encontrado para esta chave. Verifique em /pj/agentes-ia.";
        code = "MODEL_NOT_FOUND";
      }
      return new Response(
        JSON.stringify({ error: userMessage, code, upstream_status: response.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Translate Anthropic SSE -> OpenAI-style SSE if needed (frontend parses OpenAI events)
    if (!isAnthropic) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Anthropic: convert to OpenAI-style SSE stream for consistent frontend parsing
    const reader = response.body!.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (!data || data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  const out = {
                    choices: [
                      {
                        delta: { content: parsed.delta.text },
                        index: 0,
                      },
                    ],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(out)}\n\n`));
                } else if (parsed.type === "message_stop") {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                }
              } catch {
                // skip malformed line
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[ai-project-planner] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno",
        code: "INTERNAL_ERROR",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
