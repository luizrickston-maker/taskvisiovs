import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Cabeçalho de autorização ausente' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user: callingUser }, error: callingUserError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (callingUserError || !callingUser) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      email, 
      password, 
      name, 
      role, 
      workspace_id, 
      cost, 
      contract_type, 
      payment_day, 
      hours_available,
      clt_benefits,
      notes,
      whatsapp
    } = await req.json();

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes: email, password e name são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolver e validar workspace_id
    let resolvedWorkspaceId = workspace_id;
    if (!resolvedWorkspaceId) {
      const { data: ownerWs } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('owner_user_id', callingUser.id)
        .maybeSingle();
      resolvedWorkspaceId = ownerWs?.id || null;
    } else {
      // Validar se o usuário que está chamando tem permissão no workspace fornecido
      const { data: membership, error: memberErr } = await supabaseAdmin
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', resolvedWorkspaceId)
        .eq('user_id', callingUser.id)
        .single();

      if (memberErr || !membership || !['owner', 'admin'].includes(membership.role)) {
        return new Response(JSON.stringify({ error: 'Acesso negado para este workspace' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!resolvedWorkspaceId) {
      return new Response(JSON.stringify({ error: 'Workspace não encontrado ou acesso negado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Criar ou obter usuário na Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (userError) {
      // Se o usuário já existir, tentamos atualizar a senha
      const msg = (userError.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('exist') || (userError as any).code === 'email_exists') {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000, page: 1 });
        const existingUser = existingUsers.users.find(u => u.email === email);
        
        if (existingUser) {
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });
          
          // Vincular ao corporate_team
          const { data: teamData, error: teamError } = await supabaseAdmin
            .from('corporate_team')
            .upsert({
              user_id: callingUser.id,
              workspace_id: resolvedWorkspaceId,
              name,
              role,
              member_user_id: existingUser.id,
              cost: cost || 0,
              contract_type: contract_type || 'pj',
              payment_day: payment_day || 5,
              hours_available: hours_available || 160,
              clt_benefits: clt_benefits || 0,
              notes,
              whatsapp: whatsapp || null,
              is_active: true
            }, { onConflict: 'member_user_id' })
            .select()
            .single();

          if (teamError) throw teamError;

          // Garantir papel de colaborador
          const { error: roleError } = await supabaseAdmin.from('user_roles').upsert({
            user_id: existingUser.id,
            role: 'collaborator'
          }, { onConflict: 'user_id, role' });

          if (roleError) console.error('Erro ao atribuir papel:', roleError);

          // Garantir acesso ao workspace
          await supabaseAdmin.from('workspace_members').upsert({
            workspace_id: resolvedWorkspaceId,
            user_id: existingUser.id,
            role: 'member'
          }, { onConflict: 'workspace_id, user_id' });

          return new Response(JSON.stringify({ success: true, user_id: existingUser.id, team_id: teamData.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    // 2. Adicionar ao corporate_team
    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('corporate_team')
      .insert({
        user_id: callingUser.id,
        workspace_id: resolvedWorkspaceId,
        name,
        role,
        member_user_id: userId,
        cost: cost || 0,
        contract_type: contract_type || 'pj',
        payment_day: payment_day || 5,
        hours_available: hours_available || 160,
        clt_benefits: clt_benefits || 0,
        notes,
        whatsapp: whatsapp || null,
        is_active: true
      })
      .select()
      .single();

    if (teamError) throw teamError;

    // 3. Atribuir papel de colaborador
    const { error: roleError } = await supabaseAdmin.from('user_roles').upsert({
      user_id: userId,
      role: 'collaborator'
    }, { onConflict: 'user_id, role' });

    if (roleError) console.error('Erro ao atribuir papel:', roleError);

    // 4. Garantir acesso ao workspace
    await supabaseAdmin.from('workspace_members').upsert({
      workspace_id: resolvedWorkspaceId,
      user_id: userId,
      role: 'member'
    }, { onConflict: 'workspace_id, user_id' });

    return new Response(JSON.stringify({ success: true, user_id: userId, team_id: teamData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    console.error('create-collaborator erro:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
