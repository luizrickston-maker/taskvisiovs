import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generatePassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$!';
  const all = upper + lower + digits + symbols;

  const rand = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const required = [rand(upper), rand(lower), rand(digits), rand(symbols)];
  const rest = Array.from({ length: length - required.length }, () => rand(all));
  return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
}

async function sendCredentialsEmail(
  email: string,
  password: string,
  clientName: string,
): Promise<void> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY não configurado — email não enviado');
    return;
  }

  const portalUrl = 'https://taskvisionpro.lovable.app/auth';

  const htmlBody = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Acesso ao Portal do Cliente</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.4);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                🔐 Acesso ao Portal do Cliente
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#cbd5e1;font-size:16px;line-height:1.6;">
                Olá! Seu acesso ao portal foi criado com sucesso.
              </p>
              <p style="margin:0 0 28px;color:#94a3b8;font-size:14px;line-height:1.6;">
                Abaixo estão suas credenciais de acesso para o portal de <strong style="color:#e2e8f0;">${clientName}</strong>:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:8px;border:1px solid #334155;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;">
                    <table width="100%" cellpadding="0" cellspacing="8">
                      <tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:4px;">Portal</td></tr>
                      <tr><td style="padding-bottom:20px;"><a href="${portalUrl}" style="color:#818cf8;font-size:14px;text-decoration:none;">${portalUrl}</a></td></tr>
                      <tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:4px;">E-mail</td></tr>
                      <tr><td style="padding-bottom:20px;"><span style="color:#e2e8f0;font-size:14px;font-family:monospace;">${email}</span></td></tr>
                      <tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:4px;">Senha</td></tr>
                      <tr><td><span style="color:#a78bfa;font-size:16px;font-family:monospace;font-weight:700;background-color:#1e1b4b;padding:8px 16px;border-radius:6px;display:inline-block;letter-spacing:2px;">${password}</span></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
                      Acessar o Portal →
                    </a>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#422006;border-radius:8px;border:1px solid #92400e;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#fbbf24;font-size:13px;line-height:1.5;">
                      ⚠️ <strong>Aviso de segurança:</strong> Por razões de segurança, recomendamos que você altere sua senha no primeiro acesso utilizando a opção "Esqueci minha senha" na tela de login.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a;padding:20px 40px;text-align:center;border-top:1px solid #1e293b;">
              <p style="margin:0;color:#475569;font-size:12px;">
                Este e-mail foi enviado automaticamente. Em caso de dúvidas, entre em contato com seu gestor.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Portal do Cliente <onboarding@resend.dev>',
      to: [email],
      subject: `Suas credenciais de acesso — Portal ${clientName}`,
      html: htmlBody,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Erro ao enviar email via Resend:', res.status, err);
  } else {
    console.log(`Email de credenciais enviado para ${email}`);
  }
}

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

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, clientId, workspaceId, clientName, regeneratePassword } = await req.json();

    if (!email || !clientId || !workspaceId) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes: email, clientId, workspaceId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: membership, error: memberErr } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (memberErr || !membership || !['owner', 'admin'].includes(membership.role)) {
      return new Response(JSON.stringify({ error: 'Acesso negado: é necessário ser administrador do workspace' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('workspace_id', workspaceId)
      .single();

    if (clientErr || !client) {
      return new Response(JSON.stringify({ error: 'Cliente não encontrado no workspace' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingRelation } = await supabaseAdmin
      .from('client_users')
      .select('id, is_active, user_id')
      .eq('client_id', clientId)
      .eq('email', email)
      .maybeSingle();

    // Handle password regeneration for existing active users
    if (regeneratePassword && existingRelation?.is_active) {
      const newPassword = generatePassword();
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);

      if (existingUser) {
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: newPassword });
        await sendCredentialsEmail(email, newPassword, clientName ?? 'Portal do Cliente');
        return new Response(JSON.stringify({ success: true, regenerated: true, password: newPassword }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Usuário de autenticação não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingRelation) {
      if (existingRelation.is_active) {
        return new Response(JSON.stringify({ error: 'Usuário já possui acesso a este cliente' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Reativar com nova senha
      const newPassword = generatePassword();
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);

      if (existingUser) {
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: newPassword });
      }

      await supabaseAdmin
        .from('client_users')
        .update({ is_active: true })
        .eq('id', existingRelation.id);

      if (existingUser) {
        await sendCredentialsEmail(email, newPassword, clientName ?? 'Portal do Cliente');
      }

      return new Response(JSON.stringify({ success: true, reactivated: true, password: newPassword }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const password = generatePassword();

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(u => u.email === email);

    let targetUserId: string;

    if (existingAuthUser) {
      await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, { password });
      targetUserId = existingAuthUser.id;
    } else {
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr || !newUser?.user) {
        return new Response(JSON.stringify({ error: `Erro ao criar usuário: ${createErr?.message}` }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetUserId = newUser.user.id;
    }

    const { error: insertErr } = await supabaseAdmin.from('client_users').insert({
      client_id: clientId,
      workspace_id: workspaceId,
      user_id: targetUserId,
      email: email,
      is_active: true,
    });

    if (insertErr) {
      return new Response(JSON.stringify({ error: `Erro ao criar acesso: ${insertErr.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await sendCredentialsEmail(email, password, clientName ?? 'Portal do Cliente');

    return new Response(JSON.stringify({ success: true, invited: !existingAuthUser, password }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('invite-client-user erro:', err);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
