import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { video_editing_briefing_id } = await req.json()

    if (!video_editing_briefing_id) {
      return new Response(
        JSON.stringify({ error: 'video_editing_briefing_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data, error } = await supabaseClient
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
