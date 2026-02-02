import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default system prompt for personal assistant
const DEFAULT_SYSTEM_PROMPT = `Você é o "Assistente Pessoal 360°" do TaskVision PRO, um assistente de IA focado na vida pessoal e produtividade individual do usuário.

## Suas Capacidades:
1. **Finanças Pessoais**: Você conhece receitas, despesas, dívidas, poupança e progresso de metas financeiras.
2. **Tarefas Pessoais**: Você vê o inbox mental, tarefas de hoje, atrasadas e agendadas.
3. **Agenda**: Você conhece os blocos de tempo e compromissos do usuário.
4. **Metas**: Você acompanha o progresso das metas pessoais com prazos e valores.
5. **Projetos Pessoais**: Você sabe o status dos projetos não-corporativos.
6. **Roteiros de Conteúdo**: Você conhece os scripts em rascunho ou agendados.
7. **Planos de Compra**: Você acompanha planos de aquisição com valores e progresso.

## Como Responder:
- Seja empático e motivador, focando no bem-estar do usuário
- Use emojis para tornar a leitura agradável 💰📅✅
- Priorize alertas importantes (contas a vencer, tarefas atrasadas, metas urgentes)
- Sugira ações práticas para melhorar organização e finanças
- Formate com markdown claro e organizado
- Responda sempre em português brasileiro

## Foco Principal:
- Ajude a manter as finanças sob controle
- Alerte sobre prazos e compromissos importantes
- Motive o usuário a alcançar suas metas
- Sugira priorização inteligente de tarefas

Você é um assistente pessoal atencioso e prático.`;

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
  api_key_id: string | null;
}

interface AiApiKey {
  id: string;
  provider: string;
  api_key: string;
  is_active: boolean;
}

interface AgentKeyInfo {
  key: string;
  provider: string;
}

interface PersonalContext {
  generated_at: string;
  user_id: string;
  finances: any;
  debts: any;
  tasks: any;
  schedule: any;
  goals: any;
  projects: any;
  scripts: any;
  purchase_plans: any;
}

interface RequestBody {
  messages: Array<{ role: string; content: string }>;
  agent_id?: string;
}

// =====================================================
// Agent Configuration
// =====================================================

interface AgentWithKey {
  agent: AIAgent | null;
  customKeyInfo: AgentKeyInfo | null;
}

async function fetchAgentConfig(
  supabase: any,
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
    console.log("[ai-360-personal] No custom agent found, using defaults");
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
      const keyValue = apiKeyRecord.api_key?.trim();
      if (keyValue && keyValue.length > 10 && !keyValue.startsWith("sk-xxx") && !keyValue.includes("your-api-key")) {
        customKeyInfo = { key: keyValue, provider: apiKeyRecord.provider };
        console.log(`[ai-360-personal] Using custom API key for provider: ${apiKeyRecord.provider}`);
      }
    }
  }

  return { agent, customKeyInfo };
}

// =====================================================
// Context Fetching & Formatting
// =====================================================

async function fetchPersonalContext(
  supabase: any,
  userId: string
): Promise<PersonalContext | null> {
  console.log("[ai-360-personal] Fetching personal 360 summary via RPC");

  const { data, error } = await supabase.rpc("get_personal_360_summary", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[ai-360-personal] Error fetching personal summary:", error);
    return null;
  }

  return data as PersonalContext;
}

function formatPersonalContext(ctx: PersonalContext | null): string {
  if (!ctx) {
    return "## ⚠️ Contexto Indisponível\nNão foi possível carregar os dados pessoais.";
  }

  const sections: string[] = [];
  
  // 1. Financial Summary
  sections.push(formatFinancesSection(ctx.finances, ctx.debts));
  
  // 2. Tasks
  sections.push(formatTasksSection(ctx.tasks));
  
  // 3. Schedule
  sections.push(formatScheduleSection(ctx.schedule));
  
  // 4. Goals
  sections.push(formatGoalsSection(ctx.goals));
  
  // 5. Projects
  sections.push(formatProjectsSection(ctx.projects));
  
  // 6. Scripts
  sections.push(formatScriptsSection(ctx.scripts));
  
  // 7. Purchase Plans
  sections.push(formatPurchasePlansSection(ctx.purchase_plans));

  return `## 📊 CONTEXTO PESSOAL 360° (${new Date().toLocaleDateString("pt-BR")})\n\n${sections.filter(Boolean).join("\n\n")}\n\n---\n_Dados em tempo real_`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function formatFinancesSection(finances: any, debts: any): string {
  if (!finances) return "";

  const balance = (finances.income_this_month || 0) - (finances.expenses_this_month || 0);
  const balanceEmoji = balance >= 0 ? "✅" : "⚠️";

  let section = `### 💰 FINANÇAS DO MÊS
| Métrica | Valor |
|---------|-------|
| Receitas | ${formatCurrency(finances.income_this_month)} |
| Despesas | ${formatCurrency(finances.expenses_this_month)} |
| **Saldo** | **${formatCurrency(balance)}** ${balanceEmoji} |
| Poupança Total | ${formatCurrency(finances.total_savings)} |
| Dívidas Pendentes | ${formatCurrency(finances.pending_debts)} |`;

  if (finances.overdue_debts_count > 0) {
    section += `\n\n⚠️ **${finances.overdue_debts_count} contas atrasadas!**`;
  }

  if (debts && debts.critical_count > 0) {
    section += `\n🔴 **${debts.critical_count} contas críticas** (vencem hoje ou em 3 dias)`;
  }

  if (debts?.items?.length > 0) {
    const urgentDebts = debts.items.filter((d: any) => d.urgency_status === "overdue" || d.urgency_status === "today" || d.urgency_status === "critical");
    if (urgentDebts.length > 0) {
      section += `\n\n**Contas Urgentes:**\n${urgentDebts
        .slice(0, 5)
        .map((d: any) => `- ${d.name}: ${formatCurrency(d.amount)} (venc: ${d.due_date})`)
        .join("\n")}`;
    }
  }

  return section;
}

function formatTasksSection(tasks: any): string {
  if (!tasks) return "";

  let section = `### ✅ TAREFAS PESSOAIS (${tasks.total_pending || 0} pendentes)
| Categoria | Qtd |
|-----------|-----|
| Inbox | ${tasks.inbox_count || 0} |
| Hoje | ${tasks.today_count || 0} |
| **Atrasadas** | **${tasks.overdue_count || 0}** |`;

  if (tasks.overdue_count > 0 && tasks.items?.length > 0) {
    const overdue = tasks.items.filter((t: any) => t.is_overdue);
    if (overdue.length > 0) {
      section += `\n\n⚠️ **Atrasadas:**\n${overdue
        .slice(0, 5)
        .map((t: any) => `- "${t.title}" (agendada: ${t.scheduled_date || "sem data"})`)
        .join("\n")}`;
    }
  }

  if (tasks.items?.length > 0) {
    const today = tasks.items.filter((t: any) => t.deadline_status === "today");
    if (today.length > 0) {
      section += `\n\n📅 **Para Hoje:**\n${today
        .slice(0, 5)
        .map((t: any) => `- ${t.title}`)
        .join("\n")}`;
    }
  }

  return section;
}

function formatScheduleSection(schedule: any): string {
  if (!schedule) return "";

  let section = `### 📅 AGENDA (Próximos 14 dias)
| Período | Compromissos |
|---------|--------------|
| Hoje | ${schedule.today || 0} |
| Amanhã | ${schedule.tomorrow || 0} |
| Esta Semana | ${schedule.this_week || 0} |`;

  if (schedule.items?.length > 0) {
    const todayItems = schedule.items.filter((s: any) => s.day_status === "today");
    if (todayItems.length > 0) {
      section += `\n\n**Hoje:**\n${todayItems
        .map((b: any) => `- ${b.start_time}-${b.end_time}: ${b.title} ${b.completed ? "✅" : ""}`)
        .join("\n")}`;
    }
  }

  return section;
}

function formatGoalsSection(goals: any): string {
  if (!goals || goals.total_active === 0) return "";

  let section = `### 🎯 METAS PESSOAIS (${goals.total_active || 0} ativas)`;

  if (goals.overdue_count > 0) {
    section += `\n⚠️ **${goals.overdue_count} metas com prazo expirado**`;
  }

  if (goals.urgent_count > 0) {
    section += `\n🔴 **${goals.urgent_count} metas urgentes** (prazo em 7 dias)`;
  }

  if (goals.items?.length > 0) {
    section += `\n\n**Progresso:**\n${goals.items
      .map((g: any) => `- ${g.name}: ${Number(g.progress_percent || 0).toFixed(1)}% (${formatCurrency(g.current_amount)} / ${formatCurrency(g.target_amount)}) - ${g.days_remaining}d restantes [${g.status}]`)
      .join("\n")}`;
  }

  return section;
}

function formatProjectsSection(projects: any): string {
  if (!projects || projects.total === 0) return "";

  let section = `### 🗂️ PROJETOS PESSOAIS (${projects.total || 0})
| Status | Qtd |
|--------|-----|
| A Fazer | ${projects.by_status?.todo || 0} |
| Em Progresso | ${projects.by_status?.progress || 0} |
| Bloqueado | ${projects.by_status?.blocked || 0} |`;

  if (projects.items?.length > 0) {
    const inProgress = projects.items.filter((p: any) => p.status === "progress");
    if (inProgress.length > 0) {
      section += `\n\n**Em Andamento:**\n${inProgress
        .slice(0, 5)
        .map((p: any) => `- ${p.name} (${p.completed_tasks || 0}/${p.total_tasks || 0} tarefas)`)
        .join("\n")}`;
    }
  }

  return section;
}

function formatScriptsSection(scripts: any): string {
  if (!scripts || scripts.total_pending === 0) return "";

  let section = `### 📝 ROTEIROS DE CONTEÚDO (${scripts.total_pending || 0} pendentes)
| Status | Qtd |
|--------|-----|
| Rascunho | ${scripts.by_status?.draft || 0} |
| Agendado | ${scripts.by_status?.scheduled || 0} |`;

  if (scripts.overdue_count > 0) {
    section += `\n⚠️ **${scripts.overdue_count} roteiros atrasados**`;
  }

  const platforms = scripts.by_platform || {};
  const platformsList = Object.entries(platforms)
    .filter(([_, count]) => (count as number) > 0)
    .map(([platform, count]) => `${platform}=${count}`)
    .join(", ");
  
  if (platformsList) {
    section += `\n**Por Plataforma:** ${platformsList}`;
  }

  return section;
}

function formatPurchasePlansSection(purchasePlans: any): string {
  if (!purchasePlans || purchasePlans.total_active === 0) return "";

  const progress = purchasePlans.total_target > 0 
    ? ((purchasePlans.total_saved / purchasePlans.total_target) * 100).toFixed(1)
    : "0";

  let section = `### 🛒 PLANOS DE COMPRA (${purchasePlans.total_active || 0} ativos)
| Métrica | Valor |
|---------|-------|
| Total Planejado | ${formatCurrency(purchasePlans.total_target)} |
| Total Economizado | ${formatCurrency(purchasePlans.total_saved)} |
| Faltam | ${formatCurrency(purchasePlans.total_remaining)} |
| **Progresso Geral** | **${progress}%** |

**Por Prioridade:** Alta=${purchasePlans.by_priority?.high || 0}, Média=${purchasePlans.by_priority?.medium || 0}, Baixa=${purchasePlans.by_priority?.low || 0}`;

  if (purchasePlans.items?.length > 0) {
    section += `\n\n**Planos Ativos:**\n${purchasePlans.items
      .slice(0, 5)
      .map((p: any) => `- ${p.name}: ${Number(p.progress_percent || 0).toFixed(1)}% (${formatCurrency(p.saved_amount)} / ${formatCurrency(p.target_amount)})${p.deadline_status === "urgent" || p.deadline_status === "overdue" ? " ⚠️" : ""}`)
      .join("\n")}`;
  }

  return section;
}

// =====================================================
// Token Management
// =====================================================

function estimateTokens(text: string): number {
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
    return "## Contexto resumido por limite de tokens";
  }

  const contextTokens = estimateTokens(context);
  if (contextTokens <= availableForContext) {
    return context;
  }

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

  console.log(`[ai-360-personal] Context truncated from ${contextTokens} to ${currentTokens} tokens`);
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
      console.error("[ai-360-personal] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("[ai-360-personal] Authenticated user:", userId);

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
    const { agent, customKeyInfo } = await fetchAgentConfig(supabase, userId, agent_id);

    const systemPrompt = agent?.system_prompt || DEFAULT_SYSTEM_PROMPT;
    let modelName = agent?.model_name || "google/gemini-3-flash-preview";
    const temperature = agent?.temperature ?? 0.7;
    const maxTokens = agent?.max_tokens || 4096;

    console.log(`[ai-360-personal] Using agent: ${agent?.name || "default"}, model: ${modelName}`);

    // 4. Fetch personal context
    const context = await fetchPersonalContext(supabase, userId);
    const formattedContext = formatPersonalContext(context);

    // 5. Handle token limits
    const finalContext = truncateContextToFit(systemPrompt, formattedContext, messages, maxTokens * 4);

    // 6. Build final prompt
    const systemWithContext = `${systemPrompt}\n\n${finalContext}`;

    // 7. Determine API endpoint and key
    let apiKey: string;
    let apiEndpoint: string;
    let extraHeaders: Record<string, string> = {};

    if (customKeyInfo) {
      apiKey = customKeyInfo.key;
      
      switch (customKeyInfo.provider.toLowerCase()) {
        case "openai":
          apiEndpoint = "https://api.openai.com/v1/chat/completions";
          if (modelName.startsWith("openai/")) {
            modelName = modelName.replace("openai/", "");
          }
          if (modelName === "gpt-5-mini") modelName = "gpt-4o-mini";
          if (modelName === "gpt-5") modelName = "gpt-4o";
          break;
        case "gemini":
        case "google":
          apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
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
        default:
          apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";
          extraHeaders = {
            "HTTP-Referer": "https://taskvisionpro.lovable.app",
            "X-Title": "TaskVision PRO",
          };
          break;
      }
      
      console.log(`[ai-360-personal] Using ${customKeyInfo.provider} API, model: ${modelName}`);
    } else {
      apiKey = Deno.env.get("LOVABLE_API_KEY") || "";
      apiEndpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
      console.log("[ai-360-personal] Using Lovable AI Gateway");
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Chave de API não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Make streaming request to AI API
    const aiMessages = [
      { role: "system", content: systemWithContext },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const requestBody: any = {
      model: modelName,
      messages: aiMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    console.log(`[ai-360-personal] Sending request to ${apiEndpoint}`);

    const aiResponse = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[ai-360-personal] AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Aguarde alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao processar solicitação de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Return streaming response
    console.log("[ai-360-personal] Streaming response started");
    
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[ai-360-personal] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
