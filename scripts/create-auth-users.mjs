const BASE = process.env.SUPABASE_URL || 'https://gvjvwirlgzrmmeekpyzh.supabase.co';
const KEY  = process.env.SUPABASE_SERVICE_KEY; // passe via: SUPABASE_SERVICE_KEY=sb_secret_... node scripts/create-auth-users.mjs
const H    = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

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
  // Descomente e adicione o email se souber quem é:
  // { id: 'b2b019ba-198c-4a06-95cd-24302c7a9719', email: 'EMAIL_AQUI', role: 'collaborator' },
];

async function createUser(user) {
  const r = await fetch(new URL('/auth/v1/admin/users', BASE).href, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      email_confirm: true,
      password: crypto.randomUUID(), // senha temporária — usuário vai redefinir
      user_metadata: {},
    }),
  });
  return { status: r.status, body: await r.json() };
}

async function generateRecoveryLink(email) {
  const r = await fetch(new URL('/auth/v1/admin/generate_link', BASE).href, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      type: 'recovery',
      email,
      redirect_to: 'https://taskvisiovs.vercel.app/auth',
    }),
  });
  return r.json();
}

console.log('='.repeat(60));
console.log(' Criando usuários no novo Supabase (gvjvwirlgzrmmeekpyzh)');
console.log('='.repeat(60));

for (const user of USERS) {
  process.stdout.write(`\n[${user.role}] ${user.email} → ${user.id}\n`);

  const { status, body } = await createUser(user);

  if (status === 200 || status === 201) {
    console.log(`  ✅ Criado com sucesso!`);
  } else if (body?.msg?.includes('already been registered') || body?.error_code === 'email_exists') {
    console.log(`  ⚠️  Já existe — pulando criação.`);
  } else {
    console.error(`  ❌ Erro (HTTP ${status}):`, JSON.stringify(body));
    continue;
  }

  // Gera link de recuperação (reset de senha)
  const link = await generateRecoveryLink(user.email);
  if (link.action_link) {
    console.log(`  📧 Link de redefinição de senha (válido por 1h):`);
    console.log(`     ${link.action_link}`);
  } else {
    console.warn(`  ⚠️  Não foi possível gerar link:`, JSON.stringify(link));
  }
}

console.log('\n' + '='.repeat(60));
console.log(' Terceiro UUID sem email identificado:');
console.log('   b2b019ba-198c-4a06-95cd-24302c7a9719 (collaborator)');
console.log('   → Se souber o email, adicione em USERS[] e rode de novo.');
console.log('='.repeat(60));