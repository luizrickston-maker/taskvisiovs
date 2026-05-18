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
    .select("id, name, system_prompt, model_name, temperature, max_tokens, context_priority, api_key_id")
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

  // If agent has a custom API key, fetch it
  let customKeyInfo: AgentKeyInfo | null = null;
  if (agent.api_key_id) {
    const { data: keyData, error: keyError } = await supabase
      .from("ai_api_keys")
      .select("id, provider, api_key, is_active")
      .eq("id", agent.api_key_id)
      .eq("is_active", true)
      .single();

    if (!keyError && keyData) {
      const apiKeyRecord = keyData as AiApiKey;
      // Validate the API key is not empty or a placeholder
      const keyValue = apiKeyRecord.api_key?.trim();
      if (keyValue && keyValue.length > 10 && !keyValue.startsWith("sk-xxx") && !keyValue.includes("your-api-key")) {
        customKeyInfo = { key: keyValue, provider: apiKeyRecord.provider };
        console.log(`[ai-360-agent] Using custom API key for provider: ${apiKeyRecord.provider}`);
      } else {
        console.log("[ai-360-agent] Custom API key appears invalid or is a placeholder, using system key");
      }
    } else {
      console.log("[ai-360-agent] Custom API key not found or inactive, using system key");
    }
  }

  return { agent, customKeyInfo };
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
  priority: string[] = ["tasks", "projects", "sales_pipeline", "schedule", "editorial", "team"]
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
    console.log("[ai-360-agent] Fetching agent config for user:", userId);
    const { agent, customKeyInfo } = await fetchAgentConfig(supabase, userId, agent_id);

    const systemPrompt = agent?.system_prompt || DEFAULT_SYSTEM_PROMPT;
    let modelName = agent?.model_name || "google/gemini-3-flash-preview";
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

    console.log(`[ai-360-agent] Using agent: ${agent?.name || "default"}, model: ${modelName}, custom key: ${!!customKeyInfo}`);

    // 4. Fetch operational context
    const context = await fetchOperationalContext(supabase, userId);
    const formattedContext = formatAIContext(context, contextPriority);

    // 5. Handle token limits
    const finalContext = truncateContextToFit(systemPrompt, formattedContext, messages, maxTokens * 4); // input can be larger

    // 6. Build final prompt - Add safety instruction to ALL agents
    const safetyInstruction = `\n\n## INSTRUÇÃO DE SEGURANÇA GLOBAL:
Se precisar apagar algo, use: [REQUEST_DELETE: type=TIPO, id=ID, name="NOME"]
Tipos válidos: task, project, prospect, editorial_item, briefing.`;
    
    const systemWithContext = `${systemPrompt}${safetyInstruction}\n\n${finalContext}`;

    // 7. Determine API endpoint and key based on provider
    let apiKey: string;
    let apiEndpoint: string;
    let extraHeaders: Record<string, string> = {};

    if (customKeyInfo) {
      apiKey = customKeyInfo.key;
      
      // Route to the correct API based on provider
      switch (customKeyInfo.provider.toLowerCase()) {
        case "openai":
          apiEndpoint = "https://api.openai.com/v1/chat/completions";
          // Convert model name from OpenRouter format to OpenAI format
          if (modelName.startsWith("openai/")) {
            modelName = modelName.replace("openai/", "");
          }
          // Map model names to OpenAI equivalents
          if (modelName === "gpt-5-mini") modelName = "gpt-4o-mini";
          if (modelName === "gpt-5") modelName = "gpt-4o";
          if (modelName === "gpt-5-nano") modelName = "gpt-4o-mini";
          break;
        case "gemini":
        case "google":
          apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
          // Convert model name for Google API
          if (modelName.startsWith("google/")) {
            modelName = modelName.replace("google/", "");
          }
          break;
        case "anthropic":
          apiEndpoint = "https://api.anthropic.com/v1/messages";
          extraHeaders = {
            "anthropic-version": "2023-06-01",
            "x-api-key": apiKey,
          };
          break;
        case "openrouter":
        default:
          apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";
          extraHeaders = {
            "HTTP-Referer": "https://taskvisionpro.lovable.app",
            "X-Title": "TaskVision PRO",
          };
          break;
      }
      
      console.log(`[ai-360-agent] Using ${customKeyInfo.provider} API at ${apiEndpoint}, model: ${modelName}`);
    } else {
      // Use Lovable AI Gateway (default)
      apiKey = Deno.env.get("LOVABLE_API_KEY") || "";
      apiEndpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
      
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
    
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemWithContext },
          ...messages,
        ],
        temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos.", code: "RATE_LIMIT" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione mais créditos para continuar.", code: "INSUFFICIENT_CREDITS" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Chave de API inválida ou expirada.", code: "AI_ERROR" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error(`[ai-360-agent] AI API error (${response.status}):`, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar solicitação de IA", code: "AI_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
