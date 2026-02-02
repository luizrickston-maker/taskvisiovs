import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// =====================================================
// Interfaces
// =====================================================

interface AIAgent {
  id: string;
  name: string;
  system_prompt: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  context_priority: string[];
}

interface AI360Context {
  generated_at: string;
  user_id: string;
  projects: any;
  tasks: any;
  sales_pipeline: any;
  sales_goals: any[];
  schedule: any;
  editorial: any;
  team: any;
}

interface RequestBody {
  messages: Array<{ role: string; content: string }>;
  agent_id?: string;
}

// =====================================================
// Agent Configuration
// =====================================================

async function fetchAgentConfig(
  supabase: any,
  userId: string,
  agentId?: string
): Promise<AIAgent | null> {
  let query = supabase
    .from("ai_agents")
    .select("id, name, system_prompt, model_name, temperature, max_tokens, context_priority")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (agentId) {
    query = query.eq("id", agentId);
  } else {
    query = query.eq("is_default", true);
  }

  const { data, error } = await query.single();

  if (error) {
    console.log("[ai-360-agent] No custom agent found, using defaults");
    return null;
  }

  return data as AIAgent;
}

// =====================================================
// Context Fetching & Formatting
// =====================================================

async function fetchOperationalContext(
  supabase: any,
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

function formatTasksSection(tasks: any): string {
  if (!tasks) return "";

  const overdue = (tasks.items || []).filter((t: any) => t.is_overdue);
  const highPriority = (tasks.items || []).filter((t: any) => t.priority <= 2 && !t.is_overdue);

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
      .map((t: any) => `- "${t.title}" (prazo: ${t.deadline}, projeto: ${t.project_name || "N/A"})`)
      .join("\n")}`;
  }

  if (highPriority.length > 0) {
    section += `\n\n🔴 **PRIORIDADE ALTA:**\n${highPriority
      .slice(0, 3)
      .map((t: any) => `- "${t.title}" (P${t.priority})`)
      .join("\n")}`;
  }

  return section;
}

function formatProjectsSection(projects: any): string {
  if (!projects) return "";

  const overdue = (projects.items || []).filter((p: any) => p.is_overdue);

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
      .map((p: any) => `- "${p.name}" (prazo: ${p.deadline}, cliente: ${p.client_name || "Pessoal"})`)
      .join("\n")}`;
  }

  return section;
}

function formatSalesPipelineSection(pipeline: any, goals: any[]): string {
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
        (g: any) =>
          `- ${g.goal_type}: ${g.progress_percent}% (R$ ${(g.current_amount || 0).toLocaleString(
            "pt-BR"
          )} / R$ ${(g.target_amount || 0).toLocaleString("pt-BR")}) - ${g.days_remaining}d restantes [${g.status}]`
      )
      .join("\n")}`;
  }

  return section;
}

function formatScheduleSection(schedule: any): string {
  if (!schedule) return "";

  const todayItems = (schedule.items || []).filter((s: any) => s.day_status === "today");

  let section = `### 📅 AGENDA
| Período | Compromissos |
|---------|--------------|
| Hoje | ${schedule.today || 0} |
| Amanhã | ${schedule.tomorrow || 0} |
| Esta Semana | ${schedule.this_week || 0} |`;

  if (todayItems.length > 0) {
    section += `\n\n**Hoje:**\n${todayItems
      .map((b: any) => `- ${b.start_time}-${b.end_time}: ${b.title} ${b.completed ? "✅" : ""}`)
      .join("\n")}`;
  }

  return section;
}

function formatEditorialSection(editorial: any): string {
  if (!editorial) return "";

  const overdue = (editorial.items || []).filter((e: any) => e.is_overdue);

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
      .map((e: any) => `- "${e.title}" (${e.platform})`)
      .join("\n")}`;
  }

  return section;
}

function formatTeamSection(team: any): string {
  if (!team || !team.active_members) return "";

  return `### 👥 EQUIPE (${team.active_members} ativos)
- Horas disponíveis: **${team.total_hours_available || 0}h**
${(team.members || []).map((m: any) => `- ${m.name} (${m.role}): ${m.hours_available}h`).join("\n")}`;
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
  userMessages: any[],
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);

    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub as string;

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
    const agent = await fetchAgentConfig(supabase, userId, agent_id);

    const systemPrompt = agent?.system_prompt || DEFAULT_SYSTEM_PROMPT;
    const modelName = agent?.model_name || "google/gemini-3-flash-preview";
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

    console.log(`[ai-360-agent] Using agent: ${agent?.name || "default"}, model: ${modelName}`);

    // 4. Fetch operational context
    const context = await fetchOperationalContext(supabase, userId);
    const formattedContext = formatAIContext(context, contextPriority);

    // 5. Handle token limits
    const finalContext = truncateContextToFit(systemPrompt, formattedContext, messages, maxTokens * 4); // input can be larger

    // 6. Build final prompt
    const systemWithContext = `${systemPrompt}\n\n${finalContext}`;

    // 7. Get API key (Lovable AI is auto-provisioned)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não está configurada");
    }

    // 8. Call AI Gateway
    console.log("[ai-360-agent] Calling AI Gateway with streaming");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "system", content: systemWithContext }, ...messages],
        temperature,
        stream: true,
      }),
    });

    // 9. Handle errors
    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Limite de requisições excedido. Aguarde alguns minutos.",
            code: "RATE_LIMIT",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos de IA esgotados. Adicione mais créditos em Configurações > Workspace.",
            code: "INSUFFICIENT_CREDITS",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[ai-360-agent] AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar solicitação de IA", code: "AI_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. Stream response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[ai-360-agent] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
        code: "INTERNAL_ERROR",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
