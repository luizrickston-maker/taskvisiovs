import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { briefing_id } = await req.json();

    if (!briefing_id) {
      throw new Error("briefing_id is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate a secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Update the briefing with the token and expiration
    const { error: updateError } = await supabase
      .from("briefings")
      .update({
        magic_link_token: token,
        magic_link_expires_at: expiresAt.toISOString(),
      })
      .eq("id", briefing_id);

    if (updateError) throw updateError;

    // Get the base URL from the request origin or fallback
    const origin = req.headers.get("origin") || req.headers.get("referer");
    const siteUrl = origin ? new URL(origin).origin : (Deno.env.get("SITE_URL") || "https://taskvisionpro.lovable.app");
    const magicLink = `${siteUrl}/briefing/fill?token=${token}`;

    return new Response(JSON.stringify({ magicLink, token, expiresAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
