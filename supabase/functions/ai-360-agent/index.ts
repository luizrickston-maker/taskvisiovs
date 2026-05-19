import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  AIAgent,
  AiApiKey,
  AgentKeyInfo,
  AgentWithKey,
  AI360Context,
  ChatMessage,
  TasksSummary,
  TaskItem,
  ProjectsSummary,
  ProjectItem,
  SalesPipelineSummary,
  SalesGoalProgress,
  ScheduleSummary,
  AppointmentItem,
  EditorialSummary,
  EditorialItem,
  TeamSummary,
  TeamMember,
} from "../_shared/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default system prompt fallback
const DEFAULT_SYSTEM_PROMPT = `Você é o "Cérebro Operacional" do TaskVision PRO, um assistente de IA avançado projetado para fornecer uma visão 360° das operações do usuário.

## Como Responder:
- Seja conciso e direto, mas completo quando necessário
- Use emojis para tornar a leitura mais agradável 📊
- Priorize informações críticas (prazos próximos, tarefas atrasadas, oportunidades de vendas)
- Sugira ações proativas quando identificar gargalos ou oportunidades
- Formate listas e dados de forma clara usando markdown
- Responda sempre em português brasileiro

Você é proativo, estratégico e ajuda o usuário a tomar decisões baseadas em dados.`;

interface RequestBody {
  messages: ChatMessage[];
  agent_id?: string;
}

// =====================================================
// Agent Configuration
// =====================================================

// deno-lint-ignore no-explicit-any
type SupabaseClientType = ReturnType<typeof createClient<any>>;

async function fetchAgentConfig(
  supabase: SupabaseClientType,
  userId: string,
  agentId?: string
): Promise<AgentWithKey> {
  let query = supabase
    .from("ai_agents")
    .select("id, name, system_prompt, model_name, temperature, max_tokens, context_priority, api_key_id, routing_enabled, model_name_simple, model_name_standard, model_name_complex, api_key_id_simple, api_key_id_standard, api_key_id_complex")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (agentId) {
    query = query.eq("id", agentId);
  } else {
    query = query.eq("is_default", true);
  }

  const { data: agentData, error: agentError } = await query.single();

  if (agentError || !agentData) {
    console.log("[ai-360-agent] No custom agent found, using defaults");
    return { agent: null, customKeyInfo: null };
  }

  const agent = agentData as AIAgent;

  // Helper to fetch key info
  const fetchKey = async (keyId: string | null): Promise<AgentKeyInfo | null> => {
    if (!keyId) return null;
    const { data, error } = await supabase
      .from("ai_api_keys")
      .select("id, provider, api_key, is_active")
      .eq("id", keyId)
      .eq("is_active", true)
      .single();

    if (error || !data) return null;
    const apiKeyRecord = data as AiApiKey;
    const keyValue = apiKeyRecord.api_key?.trim();
    if (keyValue && keyValue.length > 10 && !keyValue.startsWith("sk-xxx")) {
      return { key: keyValue, provider: apiKeyRecord.provider };
    }
    return null;
  };

  // Fetch primary key
  const customKeyInfo = await fetchKey(agent.api_key_id);
  
  // Fetch level keys if routing enabled
  let levelKeys = undefined;
  if (agent.routing_enabled) {
    levelKeys = {
      simple: await fetchKey(agent.api_key_id_simple),
      standard: await fetchKey(agent.api_key_id_standard),
      complex: await fetchKey(agent.api_key_id_complex),
    };
  }

  return { agent, customKeyInfo, levelKeys };
}

// =====================================================
// Context Fetching & Formatting
// =====================================================

async function fetchOperationalContext(
  supabase: SupabaseClientType,
  userId: string
): Promise<AI360Context | null> {
  console.log("[ai-360-agent] Fetching 360 summary via SQL function");

  const { data, error } = await supabase.rpc("get_user_360_summary", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[ai-360-agent] Error fetching 360 summary:", error);
    return null;
  }

  return data as AI360Context;
}

function formatAIContext(
  ctx: AI360Context | null,
  priority: string[] = ["tasks", "projects", "sales_pipeline", "schedule", "editorial", "team", "investments"]
): string {
  if (!ctx) {
    return "## ⚠️ Contexto Indisponível\nNão foi possível carregar os dados operacionais.";
  }

  const sections: Record<string, () => string> = {
    tasks: () => formatTasksSection(ctx.tasks),
    projects: () => formatProjectsSection(ctx.projects),
    sales_pipeline: () => formatSalesPipelineSection(ctx.sales_pipeline, ctx.sales_goals),
    schedule: () => formatScheduleSection(ctx.schedule),
    editorial: () => formatEditorialSection(ctx.editorial),
    team: () => formatTeamSection(ctx.team),
    investments: () => formatInvestmentsSection(ctx.investments),
  };

  const formattedSections = priority
    .filter((key) => sections[key])
    .map((key) => sections[key]())
    .join("\n\n");

  return `## 📊 CONTEXTO OPERACIONAL (${new Date().toLocaleDateString("pt-BR")})\n\n${formattedSections}\n\n---\n_Dados em tempo real_`;
}

function formatTasksSection(tasks: TasksSummary | null): string {
  if (!tasks) return "";

  const overdue = (tasks.items || []).filter((t: TaskItem) => t.is_overdue);
  const highPriority = (tasks.items || []).filter((t: TaskItem) => t.priority <= 2 && !t.is_overdue);

  let section = `### ✅ TAREFAS PENDENTES (${tasks.total_pending || 0})
| Métrica | Valor |
|---------|-------|
| A Fazer | ${tasks.by_status?.todo || 0} |
| Em Progresso | ${tasks.by_status?.in_progress || 0} |
| **Atrasadas** | **${tasks.overdue_count || 0}** |
| Hoje | ${tasks.due_today || 0} |
| Esta Semana | ${tasks.due_this_week || 0} |
| Alta Prioridade | ${tasks.high_priority || 0} |`;

  if (overdue.length > 0) {
    section += `\n\n⚠️ **ATRASADAS:**\n${overdue
      .slice(0, 5)
      .map((t: TaskItem) => `- "${t.title}" (prazo: ${t.deadline}, projeto: ${t.project_name || "N/A"})`)
      .join("\n")}`;
  }

  if (highPriority.length > 0) {
    section += `\n\n🔴 **PRIORIDADE ALTA:**\n${highPriority
      .slice(0, 3)
      .map((t: TaskItem) => `- "${t.title}" (P${t.priority})`)
      .join("\n")}`;
  }

  return section;
}

function formatProjectsSection(projects: ProjectsSummary | null): string {
  if (!projects) return "";

  const overdue = (projects.items || []).filter((p: ProjectItem) => p.is_overdue);

  let section = `### 🗂️ PROJETOS (${projects.total || 0})
| Status | Quantidade |
|--------|------------|
| A Fazer | ${projects.by_status?.todo || 0} |
| Em Progresso | ${projects.by_status?.progress || 0} |
| Bloqueado | ${projects.by_status?.blocked || 0} |
| Concluído | ${projects.by_status?.done || 0} |
| **Atrasados** | **${projects.overdue_count || 0}** |
| Corporativos | ${projects.corporate_count || 0} |`;

  if (overdue.length > 0) {
    section += `\n\n⚠️ **PROJETOS ATRASADOS:**\n${overdue
      .slice(0, 3)
      .map((p: ProjectItem) => `- "${p.name}" (prazo: ${p.deadline}, cliente: ${p.client_name || "Pessoal"})`)
      .join("\n")}`;
  }

  return section;
}

function formatSalesPipelineSection(pipeline: SalesPipelineSummary | null, goals: SalesGoalProgress[]): string {
  if (!pipeline) return "";

  const activeProspects =
    (pipeline.by_status?.novo || 0) +
    (pipeline.by_status?.em_negociacao || 0) +
    (pipeline.by_status?.proposta_enviada || 0);

  let section = `### 💼 PIPELINE DE VENDAS
| Estágio | Qtd |
|---------|-----|
| Novo | ${pipeline.by_status?.novo || 0} |
| Em Negociação | ${pipeline.by_status?.em_negociacao || 0} |
| Proposta Enviada | ${pipeline.by_status?.proposta_enviada || 0} |
| **Total Ativo** | **${activeProspects}** |

**Valores:**
- Em negociação: **R$ ${(pipeline.total_value || 0).toLocaleString("pt-BR")}**
- Valor ponderado: R$ ${(pipeline.weighted_value || 0).toLocaleString("pt-BR")}
- Já fechado: R$ ${(pipeline.closed_value || 0).toLocaleString("pt-BR")}`;

  if (goals && goals.length > 0) {
    section += `\n\n**Metas:**\n${goals
      .map(
        (g: SalesGoalProgress) =>
          `- ${g.goal_type}: ${g.progress_percent}% (R$ ${(g.current_amount || 0).toLocaleString(
            "pt-BR"
          )} / R$ ${(g.target_amount || 0).toLocaleString("pt-BR")}) - ${g.days_remaining}d restantes [${g.status}]`
      )
      .join("\n")}`;
  }

  return section;
}

function formatScheduleSection(schedule: ScheduleSummary | null): string {
  if (!schedule) return "";

  const todayItems = (schedule.items || []).filter((s: AppointmentItem) => s.day_status === "today");

  let section = `### 📅 AGENDA
| Período | Compromissos |
|---------|--------------|
| Hoje | ${schedule.today || 0} |
| Amanhã | ${schedule.tomorrow || 0} |
| Esta Semana | ${schedule.this_week || 0} |`;

  if (todayItems.length > 0) {
    section += `\n\n**Hoje:**\n${todayItems
      .map((b: AppointmentItem) => `- ${b.start_time}-${b.end_time}: ${b.title} ${b.completed ? "✅" : ""}`)
      .join("\n")}`;
  }

  return section;
}

function formatEditorialSection(editorial: EditorialSummary | null): string {
  if (!editorial) return "";

  const overdue = (editorial.items || []).filter((e: EditorialItem) => e.is_overdue);

  let section = `### 📱 CALENDÁRIO EDITORIAL (${editorial.total_pending || 0} pendentes)
| Status | Qtd |
|--------|-----|
| Ideia | ${editorial.by_status?.idea || 0} |
| Rascunho | ${editorial.by_status?.draft || 0} |
| Revisão | ${editorial.by_status?.review || 0} |
| Aprovado | ${editorial.by_status?.approved || 0} |
| **Atrasados** | **${editorial.overdue_count || 0}** |

**Por Plataforma:** IG=${editorial.by_platform?.instagram || 0}, TT=${editorial.by_platform?.tiktok || 0}, YT=${editorial.by_platform?.youtube || 0}, LI=${editorial.by_platform?.linkedin || 0}, Blog=${editorial.by_platform?.blog || 0}`;

  if (overdue.length > 0) {
    section += `\n\n⚠️ **ATRASADOS:**\n${overdue
      .slice(0, 3)
      .map((e: EditorialItem) => `- "${e.title}" (${e.platform})`)
      .join("\n")}`;
  }

  return section;
}

function formatTeamSection(team: TeamSummary | null): string {
  if (!team || !team.active_members) return "";

  return `### 👥 EQUIPE (${team.active_members} ativos)
- Horas disponíveis: **${team.total_hours_available || 0}h**
${(team.members || []).map((m: TeamMember) => `- ${m.name} (${m.role}): ${m.hours_available}h`).join("\n")}`;
}

function formatInvestmentsSection(investments: any | null): string {
  if (!investments || !investments.items || investments.items.length === 0) return "";

  let section = `### 💰 INVESTIMENTOS RECENTES
| Item | Valor | Data |
|------|-------|------|`;
  
  investments.items.slice(0, 10).forEach((inv: any) => {
    section += `\n| ${inv.item_name} | R$ ${inv.amount.toLocaleString('pt-BR')} | ${inv.purchase_date} |`;
  });

  section += `\n\nTotal investido: **R$ ${investments.total_amount.toLocaleString('pt-BR')}**`;
  return section;
}

// =====================================================
// Token Management
// =====================================================

function estimateTokens(text: string): number {
  // Rough estimation: ~4 chars per token for Portuguese
  return Math.ceil(text.length / 4);
}

function truncateContextToFit(
  systemPrompt: string,
  context: string,
  userMessages: ChatMessage[],
  maxTokens: number
): string {
  const reserveForResponse = Math.min(2000, maxTokens / 2);
  const systemTokens = estimateTokens(systemPrompt);
  const userTokens = userMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  const availableForContext = maxTokens - systemTokens - userTokens - reserveForResponse;

  if (availableForContext <= 0) {
    console.log("[ai-360-agent] No room for context, returning minimal");
    return "## Contexto resumido por limite de tokens";
  }

  const contextTokens = estimateTokens(context);
  if (contextTokens <= availableForContext) {
    return context;
  }

  // Truncate context intelligently - keep headers and critical info
  const lines = context.split("\n");
  let truncated = "";
  let currentTokens = 0;

  for (const line of lines) {
    const lineTokens = estimateTokens(line);
    if (currentTokens + lineTokens > availableForContext) {
      truncated += "\n\n_[Contexto truncado por limite de tokens]_";
      break;
    }
    truncated += line + "\n";
    currentTokens += lineTokens;
  }

  console.log(`[ai-360-agent] Context truncated from ${contextTokens} to ${currentTokens} tokens`);
  return truncated;
}

// =====================================================
// Main Handler
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token de autenticação não fornecido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[ai-360-agent] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // 2. Parse request body
    const body: RequestBody = await req.json();
    const { messages, agent_id } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Array de mensagens é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch agent configuration
    console.log("[ai-360-agent] Fetching agent config for user:", userId, "Requested agent_id:", agent_id);
    const { agent, customKeyInfo, levelKeys } = await fetchAgentConfig(supabase, userId, agent_id);
    let activeCustomKeyInfo = customKeyInfo;

    // Use default values if agent not found but agent_id was provided
    if (agent_id && !agent) {
      console.warn(`[ai-360-agent] Requested agent ${agent_id} not found or inactive, falling back to default`);
    }

    const systemPrompt = agent?.system_prompt || DEFAULT_SYSTEM_PROMPT;
    let modelName = agent?.model_name || "google/gemini-1.5-flash";
    const temperature = agent?.temperature ?? 0.7;
    const maxTokens = agent?.max_tokens || 4096;
    const contextPriority = agent?.context_priority || [
      "tasks",
      "projects",
      "sales_pipeline",
      "schedule",
      "editorial",
      "team",
    ];

    // 4. Implement routing if enabled
    if (agent?.routing_enabled) {
      console.log("[ai-360-agent] Routing enabled, determining task complexity...");
      const lastMessage = messages[messages.length - 1].content.toLowerCase();
      
      // Heuristic classification (Simple vs Complex)
      const simplePatterns = [
        "bom dia", "olá", "oi", "boa tarde", "boa noite", "obrigado", "valeu", "ok", "entendido",
        "concluído", "feito", "marcar como", "listar", "quais as tarefas", "resumo de hoje", "agora"
      ];
      const complexPatterns = [
        "analise", "planeje", "sugira", "estratégia", "relatório", "por que", "comparação", "tendência",
        "lucro", "performance", "gargalo", "previsão", "crie um plano", "como posso"
      ];

      const isComplex = complexPatterns.some(p => lastMessage.includes(p)) || lastMessage.length > 200;
      const isSimple = simplePatterns.some(p => lastMessage.includes(p)) && lastMessage.length < 100;

      if (isSimple) {
        modelName = agent.model_name_simple || "google/gemini-1.5-flash";
        if (levelKeys?.simple) activeCustomKeyInfo = levelKeys.simple;
        console.log("[ai-360-agent] Routed to SIMPLE model:", modelName, "Custom Key:", !!levelKeys?.simple);
      } else if (isComplex) {
        modelName = agent.model_name_complex || "google/gemini-1.5-pro";
        if (levelKeys?.complex) activeCustomKeyInfo = levelKeys.complex;
        console.log("[ai-360-agent] Routed to COMPLEX model:", modelName, "Custom Key:", !!levelKeys?.complex);
      } else {
        modelName = agent.model_name_standard || agent.model_name || "google/gemini-1.5-flash";
        if (levelKeys?.standard) activeCustomKeyInfo = levelKeys.standard;
        console.log("[ai-360-agent] Routed to STANDARD model:", modelName, "Custom Key:", !!levelKeys?.standard);
      }
    }

    console.log(`[ai-360-agent] Using agent: ${agent?.name || "default"}, model: ${modelName}, custom key: ${!!activeCustomKeyInfo}`);

    // 4. Fetch operational context
    const context = await fetchOperationalContext(supabase, userId);
    const formattedContext = formatAIContext(context, contextPriority);

    // 5. Handle token limits
    const finalContext = truncateContextToFit(systemPrompt, formattedContext, messages, maxTokens);

    // 6. Build final prompt - Add safety instruction to ALL agents
    const globalInstructions = `\n\n## INSTRUÇÕES GLOBAIS DE OPERAÇÃO:
1. PARA APAGAR: Quando o usuário quiser apagar algo (tarefa, projeto, prospect, etc), NÃO peça o ID. 
   Analise o contexto fornecido e identifique os itens correspondentes.
   Sugira os itens encontrados no formato: "Encontrei estes itens: [DELETE_SUGGESTION: type=TIPO, id=ID, name="NOME"]. Qual deles você deseja remover?"
   Tipos válidos: task, project, prospect, editorial_item, briefing.
2. PARA ADICIONAR INVESTIMENTO: use [REQUEST_ADD_INVESTMENT: item_name="NOME", amount=VALOR, category="CATEGORIA", notes="OBSERVAÇÕES"]
   Exemplo: [REQUEST_ADD_INVESTMENT: item_name="SSD 1TB iPhone", amount=500.00, category="Equipamentos", notes="Upgrade de armazenamento"]
3. Seja proativo e execute as ações acima sempre que o usuário solicitar algo que se encaixe nelas.`;
    
    const systemWithContext = `${systemPrompt}${globalInstructions}\n\n${finalContext}`;

    // 7. Determine API endpoint and key based on provider
    let apiKey: string;
    let apiEndpoint: string;
    let extraHeaders: Record<string, string> = {};

    if (activeCustomKeyInfo) {
      apiKey = activeCustomKeyInfo.key;
      const rawProvider = activeCustomKeyInfo.provider.toLowerCase();
      let rawModel = modelName.includes("/") ? modelName.split("/")[1] : modelName;
      
      // Standardize model names and fix common typos
      if (rawModel.includes("gemini-flash-1.5")) rawModel = "gemini-1.5-flash";
      if (rawModel.includes("gemini-pro-1.5")) rawModel = "gemini-1.5-pro";

      // Route to the correct API based on provider, with model validation
      switch (rawProvider) {
        case "openai":
          apiEndpoint = "https://api.openai.com/v1/chat/completions";
          // Validate model belongs to OpenAI; otherwise fallback to a default
          if (/^(gpt-|o1|o3|chatgpt)/i.test(rawModel)) {
            modelName = rawModel;
          } else {
            console.warn(`[ai-360-agent] Model "${rawModel}" not compatible with OpenAI key. Falling back to gpt-4o-mini.`);
            modelName = "gpt-4o-mini";
          }
          break;
        case "gemini":
        case "google":
          apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
          if (/^gemini/i.test(rawModel)) {
            modelName = rawModel;
          } else {
            console.warn(`[ai-360-agent] Model "${rawModel}" not compatible with Google key. Falling back to gemini-1.5-flash.`);
            modelName = "gemini-1.5-flash";
          }
          break;
        case "anthropic":
          apiEndpoint = "https://api.anthropic.com/v1/messages";
          extraHeaders = {
            "anthropic-version": "2023-06-01",
            "x-api-key": apiKey,
          };
          apiKey = "";
          if (/^claude/i.test(rawModel)) {
            modelName = rawModel;
          } else {
            console.warn(`[ai-360-agent] Model "${rawModel}" not compatible with Anthropic key. Falling back to claude-3-5-sonnet-latest.`);
            modelName = "claude-3-5-sonnet-latest";
          }
          break;
        case "openrouter":
        default:
          apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";
          extraHeaders = {
            "HTTP-Referer": "https://taskvisionpro.lovable.app",
            "X-Title": "TaskVision PRO",
          };
          // OpenRouter accepts the full "provider/model" format
          break;
      }
      
      console.log(`[ai-360-agent] Using ${rawProvider} API at ${apiEndpoint}, model: ${modelName}`);
    } else {
      // Use Lovable AI Gateway (default)
      apiKey = Deno.env.get("LOVABLE_API_KEY") || "";
      apiEndpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
      
      // Mapping for models supported by the current Lovable AI Gateway configuration
      const m = modelName.toLowerCase();
      if (m.includes("gemini-1.5-flash") || m.includes("gemini-flash-1.5") || m.includes("gemini-flash")) {
        modelName = "google/gemini-2.5-flash";
      } else if (m.includes("gemini-1.5-pro") || m.includes("gemini-pro-1.5") || m.includes("gemini-pro")) {
        modelName = "google/gemini-2.5-pro";
      } else if (m.includes("gpt-4o-mini") || m.includes("gpt-3.5")) {
        modelName = "openai/gpt-5-mini";
      } else if (m.includes("gpt-4") || m.includes("gpt-o1") || m.includes("gpt-o3")) {
        modelName = "openai/gpt-5";
      } else {
        // Fallback to a guaranteed supported model if it's unknown
        console.warn(`[ai-360-agent] Unknown model "${modelName}" for Lovable Gateway. Falling back to google/gemini-2.5-flash.`);
        modelName = "google/gemini-2.5-flash";
      }

      if (!apiKey) {
        console.error("[ai-360-agent] No LOVABLE_API_KEY configured");
        return new Response(
          JSON.stringify({ error: "Configuração de IA não encontrada" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 8. Call AI API with streaming
    console.log(`[ai-360-agent] Calling AI API with model: ${modelName}`);
    
    // Prepare request body
    let requestBody: any = {
      model: modelName,
      temperature,
      stream: true,
    };

    const isAnthropic = activeCustomKeyInfo?.provider.toLowerCase() === "anthropic";

    if (isAnthropic) {
      requestBody.system = systemWithContext;
      requestBody.messages = messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content || "",
      }));
      requestBody.max_tokens = maxTokens || 4096;
    } else {
      requestBody.messages = [
        { role: "system", content: systemWithContext },
        ...messages.map(m => ({
          role: m.role,
          content: m.content || "",
        })),
      ];
      requestBody.max_tokens = maxTokens;
    }

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[ai-360-agent] AI API error (${response.status}):`, errorText);

      let userMessage = "Erro ao processar solicitação de IA";
      let code = "AI_ERROR";
      if (response.status === 429) {
        userMessage = "Limite de requisições da chave de IA excedido. Tente novamente em alguns minutos ou troque de modelo.";
        code = "RATE_LIMIT";
      } else if (response.status === 402) {
        userMessage = "Créditos de IA esgotados. Adicione mais créditos para continuar.";
        code = "INSUFFICIENT_CREDITS";
      } else if (response.status === 401) {
        userMessage = "Chave de API inválida ou expirada.";
        code = "INVALID_KEY";
      } else if (response.status === 404) {
        userMessage = "Modelo de IA não encontrado para esta chave. Verifique a configuração do agente.";
        code = "MODEL_NOT_FOUND";
      }

      // Return 200 with error payload to avoid triggering runtime error overlays.
      // Frontend renders the message inline in the chat.
      return new Response(
        JSON.stringify({ error: userMessage, code, upstream_status: response.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[ai-360-agent] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
