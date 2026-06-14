/**
 * migrate-auth-users.mjs
 *
 * Descobre os UUIDs dos usuários a partir dos dados já migrados no novo projeto,
 * cria os usuários em auth.users preservando os mesmos UUIDs, e dispara
 * um email de redefinição de senha para cada um.
 *
 * Uso:
 *   node scripts/migrate-auth-users.mjs
 *
 * Pré-requisito: node >= 18 (usa fetch nativo)
 */

const NEW_PROJECT_URL = process.env.SUPABASE_URL || 'https://gvjvwirlgzrmmeekpyzh.supabase.co';
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // passe via: SUPABASE_SERVICE_KEY=sb_secret_... node scripts/migrate-auth-users.mjs

// ─── Usuários conhecidos ──────────────────────────────────────────────────────
// Adicione aqui os emails que você sabe que existiam no projeto antigo.
// O script descobrirá os UUIDs automaticamente a partir dos dados migrados.
// Se não souber o UUID, coloque null e o script tentará descobrir.
const KNOWN_USERS = [
  { email: 'chapadadigitalbr@gmail.com', uuid: null, role: 'gestor principal' },
  { email: 'ludomotion@gmail.com',        uuid: null, role: 'colaborador'      },
  // Adicione outros usuários aqui se necessário:
  // { email: 'cliente@exemplo.com', uuid: null, role: 'cliente' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function adminFetch(path, options = {}) {
  const res = await fetch(`${NEW_PROJECT_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': NEW_SERVICE_KEY,
      'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

async function dbQuery(sql) {
  // Usa a REST API do PostgREST para queries simples (sem psql)
  // Para queries arbitrárias, usa a função rpc se disponível
  const res = await fetch(`${NEW_PROJECT_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': NEW_SERVICE_KEY,
      'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  return res.ok ? await res.json() : null;
}

async function listExistingUsers() {
  const { body } = await adminFetch('/auth/v1/admin/users?per_page=100');
  return body.users || [];
}

async function discoverUUIDs() {
  console.log('\n🔍 Descobrindo UUIDs a partir dos dados migrados...');
  const discovered = {};

  // Tenta descobrir via workspace_members (tem user_id + email implícito via FK)
  const wmRes = await fetch(`${NEW_PROJECT_URL}/rest/v1/workspace_members?select=user_id`, {
    headers: {
      'apikey': NEW_SERVICE_KEY,
      'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
    },
  });

  if (wmRes.ok) {
    const members = await wmRes.json();
    const uniqueIds = [...new Set(members.map(m => m.user_id).filter(Boolean))];
    console.log(`   Encontrados ${uniqueIds.length} UUIDs em workspace_members:`, uniqueIds);

    // Para cada UUID, verifica se já existe em auth (do novo projeto) e busca email
    for (const uuid of uniqueIds) {
      const { body } = await adminFetch(`/auth/v1/admin/users/${uuid}`);
      if (body && body.email) {
        discovered[body.email] = uuid;
        console.log(`   ✓ ${body.email} → ${uuid}`);
      }
    }
  }

  // Tenta descobrir via corporate_team (tem member_user_id)
  const ctRes = await fetch(`${NEW_PROJECT_URL}/rest/v1/corporate_team?select=member_user_id,email`, {
    headers: {
      'apikey': NEW_SERVICE_KEY,
      'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
    },
  });

  if (ctRes.ok) {
    const members = await ctRes.json();
    for (const m of members) {
      if (m.member_user_id && m.email && !discovered[m.email]) {
        discovered[m.email] = m.member_user_id;
        console.log(`   ✓ ${m.email} → ${m.member_user_id} (via corporate_team)`);
      }
    }
  }

  return discovered;
}

async function createUser(email, uuid) {
  const { status, ok, body } = await adminFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      id: uuid,                // Preserva o UUID original
      email,
      email_confirm: true,     // Confirma email diretamente
      password: crypto.randomUUID(), // Senha temporária — usuário vai usar reset
      user_metadata: {},
    }),
  });

  if (ok) {
    console.log(`   ✅ Criado: ${email} (UUID: ${uuid})`);
    return true;
  } else if (status === 422 && body?.msg?.includes('already been registered')) {
    console.log(`   ⚠️  Já existe: ${email}`);
    return true;
  } else {
    console.error(`   ❌ Erro ao criar ${email}:`, body);
    return false;
  }
}

async function sendPasswordReset(email) {
  const { ok, body } = await adminFetch('/auth/v1/admin/generate_link', {
    method: 'POST',
    body: JSON.stringify({
      type: 'recovery',
      email,
      redirect_to: 'https://taskvisiovs.vercel.app/auth',
    }),
  });

  if (ok && body.action_link) {
    console.log(`   📧 Link de recuperação para ${email}:`);
    console.log(`      ${body.action_link}`);
    return body.action_link;
  } else {
    console.warn(`   ⚠️  Não foi possível gerar link para ${email}:`, body);
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log(' TaskVisionPro — Migração de Usuários auth.users');
  console.log(' Novo projeto: gvjvwirlgzrmmeekpyzh');
  console.log('='.repeat(60));

  // 1. Listar usuários já existentes no novo projeto
  console.log('\n📋 Usuários já existentes no novo projeto:');
  const existing = await listExistingUsers();
  if (existing.length > 0) {
    existing.forEach(u => console.log(`   • ${u.email} (${u.id})`));
  } else {
    console.log('   Nenhum usuário encontrado.');
  }

  // 2. Descobrir UUIDs dos dados migrados
  const discoveredUUIDs = await discoverUUIDs();

  // 3. Combinar usuários conhecidos com UUIDs descobertos
  const existingEmails = new Set(existing.map(u => u.email));
  const results = [];

  for (const user of KNOWN_USERS) {
    const uuid = user.uuid || discoveredUUIDs[user.email];

    if (!uuid) {
      console.warn(`\n⚠️  UUID não encontrado para ${user.email}.`);
      console.warn(`   Se este usuário tinha dados no sistema, as FKs ficarão quebradas.`);
      console.warn(`   Opção: adicione o UUID manualmente em KNOWN_USERS acima.`);
      continue;
    }

    if (existingEmails.has(user.email)) {
      console.log(`\n✓ ${user.email} já existe no novo projeto — pulando criação.`);
      results.push({ email: user.email, uuid, status: 'já existia' });
      continue;
    }

    console.log(`\n👤 Criando ${user.email} (${user.role}) com UUID: ${uuid}`);
    const created = await createUser(user.email, uuid);
    if (created) {
      results.push({ email: user.email, uuid, status: 'criado' });
    }
  }

  // 4. Gerar links de reset de senha para todos
  console.log('\n' + '─'.repeat(60));
  console.log('📧 Gerando links de redefinição de senha...');
  console.log('   (Copie e envie para cada usuário ou abra direto no browser)');
  console.log('─'.repeat(60));

  for (const result of results) {
    await sendPasswordReset(result.email);
  }

  // 5. Resumo final
  console.log('\n' + '='.repeat(60));
  console.log(' RESUMO DA MIGRAÇÃO DE USUÁRIOS');
  console.log('='.repeat(60));
  for (const r of results) {
    console.log(` • ${r.email} → ${r.status} (UUID: ${r.uuid})`);
  }
  console.log('\n✅ Concluído. Próximos passos:');
  console.log('   1. Compartilhe os links de recuperação com cada usuário');
  console.log('   2. O usuário abre o link e define uma nova senha');
  console.log('   3. Os dados antigos (tarefas, projetos, etc.) estarão todos lá');
}

main().catch(err => {
  console.error('\n💥 Erro fatal:', err);
  process.exit(1);
});