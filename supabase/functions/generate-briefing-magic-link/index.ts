import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { briefing_id } = await req.json();

    if (!briefing_id) {
      throw new Error("briefing_id is required");
    }

    // Verify user has access to the briefing (via workspace)
    const { data: briefing, error: accessError } = await supabaseAdmin
      .from("briefings")
      .select("workspace_id")
      .eq("id", briefing_id)
      .single();

    if (accessError || !briefing) {
      return new Response(JSON.stringify({ error: "Briefing not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", briefing.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden: no access to this workspace" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Update the briefing with the token and expiration
    const { error: updateError } = await supabaseAdmin
      .from("briefings")
      .update({
        magic_link_token: token,
        magic_link_expires_at: expiresAt.toISOString(),
      })
      .eq("id", briefing_id);

    if (updateError) throw updateError;

    // Get the base URL from the request origin or fallback
    const origin = req.headers.get("origin") || req.headers.get("referer");
    const siteUrl = origin ? new URL(origin).origin : (Deno.env.get("SITE_URL") || "https://taskvisiovs.vercel.app");
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
