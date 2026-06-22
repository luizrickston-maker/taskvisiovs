const BASE = process.env.SUPABASE_URL || 'https://gvjvwirlgzrmmeekpyzh.supabase.co';
const KEY  = process.env.SUPABASE_SERVICE_KEY; // passe via: SUPABASE_SERVICE_KEY=sb_secret_... node scripts/create-auth-users.mjs
const H    = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

if (!KEY) {
  console.error('❌ Falta SUPABASE_SERVICE_KEY. Rode assim:');
  console.error('   SUPABASE_SERVICE_KEY=sb_secret_xxx node scripts/create-auth-users.mjs');
  process.exit(1);
}

// Senha definida diretamente (sem precisar de e-mail/link de redefinição).
// Pode trocar via env: NEW_PASSWORD=minhaSenha node scripts/create-auth-users.mjs
const PASSWORD = process.env.NEW_PASSWORD || '1234567Ll';

const USERS = [
  {
    id:    '0127a209-34af-4a06-af61-98283056ec97',
    email: 'chapadadigitalbr@gmail.com',
    role:  'owner/super_admin',
  },
  {
    id:    'f8ccc355-4e3a-4f84-a4fc-fdc98ddc1cb1',
    email: 'ludomotion@gmail.com',
    role:  'collaborator',
  },
  // Terceiro usuário — UUID conhecido mas email desconhecido.
  // { id: 'b2b019ba-198c-4a06-95cd-24302c7a9719', email: 'EMAIL_AQUI', role: 'collaborator' },
];

// Procura um usuário pelo email (varre as páginas do admin).
async function findByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(new URL(`/auth/v1/admin/users?page=${page}&per_page=200`, BASE).href, { headers: H });
    if (!r.ok) break;
    const body = await r.json();
    const list = body.users || [];
    const found = list.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (list.length < 200) break; // última página
  }
  return null;
}

async function deleteUser(id) {
  const r = await fetch(new URL(`/auth/v1/admin/users/${id}`, BASE).href, { method: 'DELETE', headers: H });
  return r.ok;
}

async function createUser(user) {
  const r = await fetch(new URL('/auth/v1/admin/users', BASE).href, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      email_confirm: true,
      password: PASSWORD,
      user_metadata: {},
    }),
  });
  return { status: r.status, body: await r.json() };
}

async function updatePassword(id) {
  const r = await fetch(new URL(`/auth/v1/admin/users/${id}`, BASE).href, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
  });
  return { status: r.status, body: await r.json() };
}

console.log('='.repeat(60));
console.log(' Recriando usuários no Supabase novo (gvjvwirlgzrmmeekpyzh)');
console.log(` Senha definida: ${PASSWORD}`);
console.log('='.repeat(60));

for (const user of USERS) {
  process.stdout.write(`\n[${user.role}] ${user.email}\n  UUID alvo: ${user.id}\n`);

  const existing = await findByEmail(user.email);

  if (existing && existing.id === user.id) {
    // Já existe com o UUID correto → só define a senha.
    const { status, body } = await updatePassword(existing.id);
    if (status === 200) console.log('  ✅ Já existia com UUID correto — senha redefinida.');
    else console.error('  ❌ Erro ao atualizar senha (HTTP ' + status + '):', JSON.stringify(body));
    continue;
  }

  if (existing && existing.id !== user.id) {
    // Existe com UUID ERRADO (provável criação manual pelo Dashboard) → apaga e recria.
    console.log(`  ⚠️  Existe com UUID errado (${existing.id}) — apagando para recriar com o correto...`);
    const ok = await deleteUser(existing.id);
    console.log(ok ? '  🗑️  Conta antiga removida.' : '  ❌ Falha ao remover conta antiga.');
  }

  const { status, body } = await createUser(user);
  if (status === 200 || status === 201) {
    console.log('  ✅ Criado com UUID correto e senha definida.');
  } else {
    console.error('  ❌ Erro ao criar (HTTP ' + status + '):', JSON.stringify(body));
  }
}

console.log('\n' + '='.repeat(60));
console.log(' Pronto. Faça login com a senha definida acima.');
console.log(' (Janela anônima → ' + BASE.replace('.supabase.co', '') + ' não, use a URL do app na Vercel)');
console.log('='.repeat(60));