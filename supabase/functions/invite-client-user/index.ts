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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, clientId, workspaceId } = await req.json();

    if (!email || !clientId || !workspaceId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, clientId, workspaceId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is a workspace admin
    const { data: membership, error: memberErr } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (memberErr || !membership || !['owner', 'admin'].includes(membership.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: must be workspace admin' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if client belongs to workspace
    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('workspace_id', workspaceId)
      .single();

    if (clientErr || !client) {
      return new Response(JSON.stringify({ error: 'Client not found in workspace' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let targetUserId: string;

    if (existingUser) {
      targetUserId = existingUser.id;
    } else {
      // Create user with a temporary password and send invite email
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${req.headers.get('origin') ?? 'https://taskvisionpro.lovable.app'}/auth/callback`,
      });
      if (createErr || !newUser?.user) {
        return new Response(JSON.stringify({ error: `Failed to invite user: ${createErr?.message}` }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetUserId = newUser.user.id;
    }

    // Check if client_user relation already exists
    const { data: existing } = await supabaseAdmin
      .from('client_users')
      .select('id, is_active')
      .eq('client_id', clientId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (existing) {
      if (existing.is_active) {
        return new Response(JSON.stringify({ error: 'User already has access to this client' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Reactivate
      await supabaseAdmin
        .from('client_users')
        .update({ is_active: true })
        .eq('id', existing.id);

      return new Response(JSON.stringify({ success: true, reactivated: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client_user record
    const { error: insertErr } = await supabaseAdmin.from('client_users').insert({
      client_id: clientId,
      workspace_id: workspaceId,
      user_id: targetUserId,
      email: email,
      is_active: true,
    });

    if (insertErr) {
      return new Response(JSON.stringify({ error: `Failed to create client user: ${insertErr.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, invited: !existingUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
