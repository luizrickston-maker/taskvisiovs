import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// System prompt APENAS para funcionalidades PESSOAIS - respostas concisas
const PERSONAL_HELP_PROMPT = `Você é o Assistente de Ajuda do TaskVision PRO (Modo Pessoal).

## REGRAS DE RESPOSTA
- Respostas CURTAS e DIRETAS (máximo 3-4 frases por vez)
- Aguarde a próxima pergunta antes de continuar
- Use bullet points para listas
- Um tópico por resposta
- Só aprofunde se o usuário pedir

## MÓDULOS PESSOAIS

### 📱 Assistente IA (/assistente-pessoal)
Chat com visão 360° dos seus dados pessoais.

### 📅 Meu Dia (/meu-dia)
- **Ações de Hoje**: Tarefas do dia
- **Agenda 48h**: Próximos compromissos
- **Inbox Mental**: Captura rápida de ideias
- **Histórico**: Atividades concluídas

### 💰 Caixa (/caixa)
Registro rápido de entradas/saídas e saldo atual.

### 📊 Finanças (/financas)
- Receitas e despesas
- Dívidas e parcelas
- Reservas/poupança

### 🎯 Planejamento (/planejamento)
Planos de compra com metas e prazos.

### 📁 Projetos (/projetos)
Kanban pessoal com tarefas e categorias.

### ✍️ Roteiros (/roteiros)
Scripts para vídeos e conteúdos.

### 📆 Conteúdos (/conteudos)
Calendário de publicações.

## DICAS RÁPIDAS
- Alterne modos no menu lateral
- IA usa seus dados reais
- Configure agentes em /config

Responda SEMPRE em português brasileiro, de forma amigável e objetiva.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AIAgent {
  id: string;
  name: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  api_key_id: string | null;
}

interface AiApiKey {
  id: string;
  provider: string;
  api_key: string;
  is_active: boolean;
}

interface RequestBody {
  messages: ChatMessage[];
  agent_id?: string;
}

// deno-lint-ignore no-explicit-any
type SupabaseClientType = ReturnType<typeof createClient<any>>;

async function fetchAgentConfig(
  supabase: SupabaseClientType,
  userId: string,
  agentId?: string
): Promise<{ modelName: string; temperature: number; maxTokens: number; apiKey: string; apiEndpoint: string; extraHeaders: Record<string, string> }> {
  let query = supabase
    .from("ai_agents")
    .select("id, name, model_name, temperature, max_tokens, api_key_id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (agentId) {
    query = query.eq("id", agentId);
  } else {
    query = query.eq("is_default", true);
  }

  const { data: agentData, error: agentError } = await query.single();

  let modelName = "google/gemini-3-flash-preview";
  let temperature = 0.7;
  let maxTokens = 2048; // Menor para respostas concisas
  let apiKey = "";
  let apiEndpoint = "";
  let extraHeaders: Record<string, string> = {};

  if (!agentError && agentData) {
    const agent = agentData as AIAgent;
    modelName = agent.model_name || modelName;
    temperature = agent.temperature ?? temperature;
    maxTokens = Math.min(agent.max_tokens || maxTokens, 2048);

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
        
        if (keyValue && keyValue.length > 10 && !keyValue.startsWith("sk-xxx")) {
          apiKey = keyValue;
          
          switch (apiKeyRecord.provider.toLowerCase()) {
            case "openai":
              apiEndpoint = "https://api.openai.com/v1/chat/completions";
              if (modelName.startsWith("openai/")) modelName = modelName.replace("openai/", "");
              if (modelName === "gpt-5-mini") modelName = "gpt-5-mini";
              if (modelName === "gpt-5") modelName = "gpt-5";
              break;
            case "gemini":
            case "google":
              apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
              if (modelName.startsWith("google/")) modelName = modelName.replace("google/", "");
              break;
            case "anthropic":
              apiEndpoint = "https://api.anthropic.com/v1/messages";
              extraHeaders = { "anthropic-version": "2023-06-01", "x-api-key": apiKey };
              break;
            case "openrouter":
            default:
              apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";
              extraHeaders = { "HTTP-Referer": Deno.env.get("SITE_URL") ?? "https://taskvisiovs.vercel.app", "X-Title": "TaskVision PRO" };
              break;
          }
        }
      }
    }
  }

  if (!apiKey) {
    const { data: fallbackKey } = await supabase
      .from("ai_api_keys")
      .select("provider, api_key")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackKey?.api_key?.trim()) {
      apiKey = fallbackKey.api_key.trim();
      switch ((fallbackKey.provider || "openrouter").toLowerCase()) {
        case "openai":
          apiEndpoint = "https://api.openai.com/v1/chat/completions";
          if (!modelName.startsWith("gpt-") && !modelName.startsWith("o1") && !modelName.startsWith("o3")) modelName = "gpt-4o-mini";
          break;
        case "gemini":
        case "google":
          apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
          if (modelName.startsWith("google/")) modelName = modelName.replace("google/", "");
          break;
        case "anthropic":
          apiEndpoint = "https://api.anthropic.com/v1/messages";
          extraHeaders = { "anthropic-version": "2023-06-01", "x-api-key": apiKey };
          break;
        case "openrouter":
        default:
          apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";
          extraHeaders = { "HTTP-Referer": Deno.env.get("SITE_URL") ?? "https://taskvisiovs.vercel.app", "X-Title": "TaskVision PRO" };
          break;
      }
    }
  }

  if (!apiKey || !apiEndpoint) {
    throw new Error("Configure uma chave de API em Configurações → Agentes IA para usar o assistente.");
  }

  return { modelName, temperature, maxTokens, apiKey, apiEndpoint, extraHeaders };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const { messages, agent_id } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Array de mensagens é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { modelName, temperature, maxTokens, apiKey, apiEndpoint, extraHeaders } = 
      await fetchAgentConfig(supabase, user.id, agent_id);

    console.log(`[ai-help-personal] Using model: ${modelName}`);

    const fullMessages: ChatMessage[] = [
      { role: "system", content: PERSONAL_HELP_PROMPT },
      ...messages,
    ];

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify({
        model: modelName,
        messages: fullMessages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ai-help-personal] API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos para continuar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao processar sua solicitação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("[ai-help-personal] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
