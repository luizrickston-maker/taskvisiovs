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
      notes 
    } = await req.json();

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes: email, password e name são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolver workspace_id se não fornecido
    let resolvedWorkspaceId = workspace_id;
    if (!resolvedWorkspaceId) {
      const { data: ownerWs } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('owner_user_id', callingUser.id)
        .maybeSingle();
      resolvedWorkspaceId = ownerWs?.id || null;
    }

    if (!resolvedWorkspaceId) {
      return new Response(JSON.stringify({ error: 'Workspace não encontrado para o usuário' }), {
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
      if (userError.message.includes('already registered')) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
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

    return new Response(JSON.stringify({ success: true, user_id: userId, team_id: teamData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('create-collaborator erro:', err);
    return new Response(JSON.stringify({ 
      error: err.message || 'Erro interno',
      details: err.stack,
      stack: err.stack
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
