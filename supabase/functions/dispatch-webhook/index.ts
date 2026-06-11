/**
 * dispatch-webhook
 *
 * Edge Function responsável por ler os endpoints configurados em
 * `webhook_configs` para o workspace e disparar o payload via HTTP POST.
 *
 * STATUS: ESTRUTURA PRONTA — não ativada em produção.
 * Para ativar: defina WEBHOOK_ENABLED=true no webhookService.ts
 * e descomente a chamada em triggerWebhook().
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { workspace_id, payload } = await req.json();

    if (!workspace_id || !payload?.event) {
      return new Response(JSON.stringify({ error: 'workspace_id e payload.event são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Busca todos os endpoints ativos para o workspace e evento
    const { data: configs, error } = await supabase
      .from('webhook_configs')
      .select('id, endpoint_url, secret_token, events')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true);

    if (error) throw error;
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ dispatched: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filtra configs que aceitam este evento
    const targets = configs.filter(
      (c) => !c.events || c.events.length === 0 || c.events.includes(payload.event),
    );

    const results = await Promise.allSettled(
      targets.map(async (config) => {
        const body = JSON.stringify(payload);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Webhook-Event': payload.event,
          'X-Webhook-Timestamp': new Date().toISOString(),
        };

        // Assina o payload com o token secreto (HMAC-SHA256 simples via hex)
        if (config.secret_token) {
          headers['X-Webhook-Signature'] = await signPayload(body, config.secret_token);
        }

        const response = await fetch(config.endpoint_url, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(10_000),
        });

        // Registra no log
        await supabase.from('webhook_event_log').insert({
          webhook_config_id: config.id,
          workspace_id,
          event_type: payload.event,
          payload,
          http_status: response.status,
          success: response.ok,
        });

        return { config_id: config.id, status: response.status, ok: response.ok };
      }),
    );

    const dispatched = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return new Response(JSON.stringify({ dispatched, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    console.error('dispatch-webhook erro:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function signPayload(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}