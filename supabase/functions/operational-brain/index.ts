import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface OperationalContext {
  projects: any[];
  projectTasks: any[];
  prospects: any[];
  salesGoals: any[];
  timeBlocks: any[];
  editorialItems: any[];
  teamMembers: any[];
}

async function fetchOperationalContext(
  supabase: any,
  userId: string
): Promise<OperationalContext> {
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Fetch all data in parallel
  const [
    { data: projects },
    { data: projectTasks },
    { data: prospects },
    { data: salesGoals },
    { data: timeBlocks },
    { data: editorialItems },
    { data: teamMembers },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, project, task, status, priority, deadline, is_corporate, client_name, company_name")
      .eq("user_id", userId)
      .order("priority", { ascending: true })
      .limit(50),
    supabase
      .from("project_tasks")
      .select("id, title, status, priority, deadline, estimated_hours, actual_hours, project_id")
      .eq("user_id", userId)
      .order("priority", { ascending: true })
      .limit(100),
    supabase
      .from("prospects")
      .select("id, client_name, company_name, status, estimated_value, prospection_date, project_type, payment_type")
      .eq("user_id", userId)
      .order("prospection_date", { ascending: false })
      .limit(50),
    supabase
      .from("sales_goals")
      .select("id, goal_type, target_amount, current_amount, start_date, end_date")
      .eq("user_id", userId)
      .gte("end_date", today)
      .limit(20),
    supabase
      .from("time_blocks")
      .select("id, title, date, start_time, end_time, type, completed")
      .eq("user_id", userId)
      .gte("date", today)
      .lte("date", nextWeek)
      .order("date", { ascending: true })
      .limit(50),
    supabase
      .from("editorial_calendar_items")
      .select("id, title, due_date, status, platform, content_type, assigned_to")
      .eq("user_id", userId)
      .gte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(30),
    supabase
      .from("corporate_team")
      .select("id, name, role, is_active, hours_available")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(20),
  ]);

  return {
    projects: projects || [],
    projectTasks: projectTasks || [],
    prospects: prospects || [],
    salesGoals: salesGoals || [],
    timeBlocks: timeBlocks || [],
    editorialItems: editorialItems || [],
    teamMembers: teamMembers || [],
  };
}

function buildContextSummary(ctx: OperationalContext): string {
  const today = new Date().toISOString().split("T")[0];
  
  // Project stats
  const projectsByStatus = ctx.projects.reduce((acc: any, p: any) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  
  const urgentProjects = ctx.projects.filter(
    (p: any) => p.deadline && p.deadline <= today && p.status !== "done"
  );

  // Task stats
  const tasksByStatus = ctx.projectTasks.reduce((acc: any, t: any) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});
  
  const overdueTasks = ctx.projectTasks.filter(
    (t: any) => t.deadline && t.deadline < today && t.status !== "done"
  );

  // Pipeline stats
  const prospectsByStatus = ctx.prospects.reduce((acc: any, p: any) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  
  const totalPipelineValue = ctx.prospects
    .filter((p: any) => p.status !== "fechado" && p.status !== "perdido")
    .reduce((sum: number, p: any) => sum + (p.estimated_value || 0), 0);

  // Sales goals progress
  const goalsProgress = ctx.salesGoals.map((g: any) => ({
    type: g.goal_type,
    progress: g.target_amount > 0 ? (g.current_amount / g.target_amount * 100).toFixed(1) : 0,
    current: g.current_amount,
    target: g.target_amount,
  }));

  // Editorial stats
  const editorialByStatus = ctx.editorialItems.reduce((acc: any, e: any) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  // Today's schedule
  const todayBlocks = ctx.timeBlocks.filter((b: any) => b.date === today);

  return `
## 📊 CONTEXTO OPERACIONAL ATUAL (${new Date().toLocaleDateString("pt-BR")})

### 🗂️ PROJETOS (${ctx.projects.length} total)
- Por status: ${JSON.stringify(projectsByStatus)}
- Projetos com prazo vencido: ${urgentProjects.length}
${urgentProjects.length > 0 ? `- URGENTES: ${urgentProjects.map((p: any) => `"${p.project}" (prazo: ${p.deadline})`).join(", ")}` : ""}

### ✅ TAREFAS (${ctx.projectTasks.length} total)
- Por status: ${JSON.stringify(tasksByStatus)}
- Tarefas atrasadas: ${overdueTasks.length}
${overdueTasks.length > 0 ? `- ATRASADAS: ${overdueTasks.slice(0, 5).map((t: any) => `"${t.title}" (prazo: ${t.deadline})`).join(", ")}` : ""}

### 💼 PIPELINE DE VENDAS
- Prospects por status: ${JSON.stringify(prospectsByStatus)}
- Valor total em negociação: R$ ${totalPipelineValue.toLocaleString("pt-BR")}
- Prospects ativos: ${ctx.prospects.filter((p: any) => !["fechado", "perdido"].includes(p.status)).length}

### 🎯 METAS DE VENDAS
${goalsProgress.map((g: any) => `- ${g.type}: ${g.progress}% (R$ ${g.current.toLocaleString("pt-BR")} / R$ ${g.target.toLocaleString("pt-BR")})`).join("\n")}

### 📅 AGENDA DE HOJE (${todayBlocks.length} compromissos)
${todayBlocks.map((b: any) => `- ${b.start_time}-${b.end_time}: ${b.title} ${b.completed ? "✅" : ""}`).join("\n") || "- Nenhum compromisso agendado"}

### 📱 CALENDÁRIO EDITORIAL
- Por status: ${JSON.stringify(editorialByStatus)}
- Total próximos itens: ${ctx.editorialItems.length}

### 👥 EQUIPE ATIVA
${ctx.teamMembers.map((m: any) => `- ${m.name} (${m.role}) - ${m.hours_available}h disponíveis`).join("\n") || "- Nenhum membro cadastrado"}

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    
    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub as string;
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch operational context
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
        model: "google/gemini-3-flash-preview",
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
