import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { video_editing_briefing_id } = await req.json();

    if (!video_editing_briefing_id) {
      return new Response(
        JSON.stringify({ error: 'video_editing_briefing_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify user has access to the video briefing
    const { data: videoBriefing, error: accessError } = await supabaseAdmin
      .from('video_editing_briefings')
      .select('briefing_id')
      .eq('id', video_editing_briefing_id)
      .single();

    if (accessError || !videoBriefing) {
      return new Response(JSON.stringify({ error: 'Video briefing not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find workspace associated with this briefing
    const { data: briefing } = await supabaseAdmin
      .from('briefings')
      .select('workspace_id')
      .eq('id', videoBriefing.briefing_id)
      .single();

    if (!briefing) {
      return new Response(JSON.stringify({ error: 'Associated briefing not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', briefing.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Forbidden: no access to this workspace' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data, error } = await supabaseAdmin
      .from('video_editing_briefings')
      .update({
        magic_link_token: token,
        magic_link_expires_at: expiresAt.toISOString(),
      })
      .eq('id', video_editing_briefing_id)
      .select()
      .single()

    if (error) throw error

    // Use a published URL if available, otherwise fallback to preview or a generic placeholder
    // In production, the user provided app.taskvision.pro
    const baseUrl = 'https://taskvisionpro.lovable.app' 
    const magicLink = `${baseUrl}/video-briefing/fill?token=${token}`

    return new Response(
      JSON.stringify({ magic_link: magicLink, token, expires_at: expiresAt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
