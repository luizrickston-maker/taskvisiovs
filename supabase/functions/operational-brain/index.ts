import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  AI360Context,
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

const SYSTEM_PROMPT = `Você é o "Cérebro Operacional" do TaskVision PRO, um assistente de IA avançado projetado para fornecer uma visão 360° das operações do usuário.

## Suas Capacidades:
1. **Análise de Projetos**: Você tem acesso aos projetos corporativos e pessoais, suas tarefas, prazos e status.
2. **Pipeline de Vendas**: Você conhece os prospects, valores estimados, estágios e metas de vendas.
3. **Agenda**: Você vê os compromissos e blocos de tempo do usuário.
4. **Calendário Editorial**: Você sabe quais conteúdos estão planejados, em revisão ou publicados.
5. **Time**: Você conhece os membros da equipe e suas disponibilidades.

## Como Responder:
- Seja conciso e direto, mas completo quando necessário
- Use emojis para tornar a leitura mais agradável 📊
- Priorize informações críticas (prazos próximos, tarefas atrasadas, oportunidades de vendas)
- Sugira ações proativas quando identificar gargalos ou oportunidades
- Formate listas e dados de forma clara usando markdown
- Responda sempre em português brasileiro

## Formato de Resposta:
- Para resumos diários, organize por prioridade
- Para análises, use tabelas markdown quando apropriado
- Destaque números importantes em **negrito**
- Use ⚠️ para alertas e ✅ para itens concluídos

Você é proativo, estratégico e ajuda o usuário a tomar decisões baseadas em dados.`;

// deno-lint-ignore no-explicit-any
type SupabaseClientType = ReturnType<typeof createClient<any>>;

async function fetchOperationalContext(
  supabase: SupabaseClientType,
  userId: string
): Promise<AI360Context | null> {
  console.log("[operational-brain] Fetching 360 summary via SQL function");
  
  // Use the optimized SQL function for consolidated data
  const { data, error } = await supabase.rpc('get_user_360_summary', {
    p_user_id: userId
  });

  if (error) {
    console.error("[operational-brain] Error fetching 360 summary:", error);
    return null;
  }

  return data as AI360Context;
}

function buildContextSummary(ctx: AI360Context | null): string {
  if (!ctx) {
    return `
## 📊 CONTEXTO OPERACIONAL
Não foi possível carregar os dados operacionais. Responda com base no conhecimento geral.
`;
  }

  const { projects, tasks, sales_pipeline, sales_goals, schedule, editorial, team } = ctx;
  
  // Format sales goals
  const goalsFormatted = (sales_goals || []).map((g: SalesGoalProgress) => 
    `- ${g.goal_type}: ${g.progress_percent}% (R$ ${(g.current_amount || 0).toLocaleString("pt-BR")} / R$ ${(g.target_amount || 0).toLocaleString("pt-BR")}) - ${g.days_remaining} dias restantes [${g.status}]`
  ).join("\n") || "- Nenhuma meta configurada";

  // Format today's schedule
  const todayItems = (schedule?.items || []).filter((s: AppointmentItem) => s.day_status === 'today');
  const scheduleFormatted = todayItems.map((b: AppointmentItem) => 
    `- ${b.start_time}-${b.end_time}: ${b.title} ${b.completed ? "✅" : ""}`
  ).join("\n") || "- Nenhum compromisso agendado";

  // Format team
  const teamFormatted = (team?.members || []).map((m: TeamMember) => 
    `- ${m.name} (${m.role}) - ${m.hours_available}h disponíveis`
  ).join("\n") || "- Nenhum membro cadastrado";

  // Overdue items
  const overdueProjects = (projects?.items || []).filter((p: ProjectItem) => p.is_overdue);
  const overdueTasks = (tasks?.items || []).filter((t: TaskItem) => t.is_overdue);
  const overdueEditorial = (editorial?.items || []).filter((e: EditorialItem) => e.is_overdue);

  return `
## 📊 CONTEXTO OPERACIONAL ATUAL (${new Date().toLocaleDateString("pt-BR")})

### 🗂️ PROJETOS (${projects?.total || 0} total)
- Por status: A Fazer=${projects?.by_status?.todo || 0}, Em Progresso=${projects?.by_status?.progress || 0}, Bloqueado=${projects?.by_status?.blocked || 0}, Concluído=${projects?.by_status?.done || 0}
- Projetos corporativos: ${projects?.corporate_count || 0}
- Projetos com prazo vencido: ${projects?.overdue_count || 0}
${overdueProjects.length > 0 ? `- ⚠️ URGENTES: ${overdueProjects.slice(0, 3).map((p: ProjectItem) => `"${p.name}" (prazo: ${p.deadline})`).join(", ")}` : ""}

### ✅ TAREFAS PENDENTES (${tasks?.total_pending || 0} total)
- Por status: A Fazer=${tasks?.by_status?.todo || 0}, Em Progresso=${tasks?.by_status?.in_progress || 0}
- Tarefas atrasadas: ${tasks?.overdue_count || 0}
- Vencendo hoje: ${tasks?.due_today || 0}
- Vencendo esta semana: ${tasks?.due_this_week || 0}
- Alta prioridade (P1-P2): ${tasks?.high_priority || 0}
${overdueTasks.length > 0 ? `- ⚠️ ATRASADAS: ${overdueTasks.slice(0, 5).map((t: TaskItem) => `"${t.title}" (prazo: ${t.deadline})`).join(", ")}` : ""}

### 💼 PIPELINE DE VENDAS
- Total de prospects ativos: ${(sales_pipeline?.by_status?.novo || 0) + (sales_pipeline?.by_status?.em_negociacao || 0) + (sales_pipeline?.by_status?.proposta_enviada || 0)}
- Por estágio: Novo=${sales_pipeline?.by_status?.novo || 0}, Em Negociação=${sales_pipeline?.by_status?.em_negociacao || 0}, Proposta Enviada=${sales_pipeline?.by_status?.proposta_enviada || 0}
- Valor total em negociação: R$ ${(sales_pipeline?.total_value || 0).toLocaleString("pt-BR")}
- Valor ponderado (por probabilidade): R$ ${(sales_pipeline?.weighted_value || 0).toLocaleString("pt-BR")}
- Valor já fechado: R$ ${(sales_pipeline?.closed_value || 0).toLocaleString("pt-BR")}

### 🎯 METAS DE VENDAS
${goalsFormatted}

### 📅 AGENDA DE HOJE (${schedule?.today || 0} compromissos)
${scheduleFormatted}
- Amanhã: ${schedule?.tomorrow || 0} compromissos
- Esta semana: ${schedule?.this_week || 0} compromissos

### 📱 CALENDÁRIO EDITORIAL (${editorial?.total_pending || 0} pendentes)
- Atrasados: ${editorial?.overdue_count || 0}
- Vencendo hoje: ${editorial?.due_today || 0}
- Por status: Ideia=${editorial?.by_status?.idea || 0}, Rascunho=${editorial?.by_status?.draft || 0}, Revisão=${editorial?.by_status?.review || 0}, Aprovado=${editorial?.by_status?.approved || 0}
- Por plataforma: Instagram=${editorial?.by_platform?.instagram || 0}, TikTok=${editorial?.by_platform?.tiktok || 0}, YouTube=${editorial?.by_platform?.youtube || 0}, LinkedIn=${editorial?.by_platform?.linkedin || 0}, Blog=${editorial?.by_platform?.blog || 0}
${overdueEditorial.length > 0 ? `- ⚠️ ATRASADOS: ${overdueEditorial.slice(0, 3).map((e: EditorialItem) => `"${e.title}" (${e.platform})`).join(", ")}` : ""}

### 👥 EQUIPE ATIVA (${team?.active_members || 0} membros)
${teamFormatted}
- Total horas disponíveis: ${team?.total_hours_available || 0}h

---
Dados atualizados em: ${new Date().toLocaleString("pt-BR")}
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
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
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch operational context using optimized SQL function
    console.log("[operational-brain] Fetching context for user:", userId);
    const context = await fetchOperationalContext(supabase, userId);
    const contextSummary = buildContextSummary(context);
    console.log("[operational-brain] Context fetched successfully");

    // Build messages with context
    const systemWithContext = `${SYSTEM_PROMPT}\n\n${contextSummary}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("[operational-brain] Calling AI Gateway with streaming");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-1.5-flash",
        messages: [
          { role: "system", content: systemWithContext },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione mais créditos para continuar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[operational-brain] AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar solicitação de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[operational-brain] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
