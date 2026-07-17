// Diagnóstico de criação de projeto: testa insert com e sem colaborador.
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const URL_BASE = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
const H = { apikey: ANON, 'Content-Type': 'application/json' };

const login = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ email: process.env.DIAG_EMAIL, password: process.env.DIAG_PASS }),
});
const auth = await login.json();
const AH = { ...H, Authorization: `Bearer ${auth.access_token}` };
console.log('✅ Login OK — user:', auth.user.id);

// 1. Colaboradores em corporate_team
const team = await (await fetch(`${URL_BASE}/rest/v1/corporate_team?select=id,name,role,member_user_id,is_active`, { headers: AH })).json();
console.log('\n👥 corporate_team:', Array.isArray(team) ? team.length : team);
if (Array.isArray(team)) team.forEach(m => console.log(`   - ${m.name} | member_user_id=${m.member_user_id} | ativo=${m.is_active}`));

const collabs = (Array.isArray(team) ? team : []).filter(m => m.member_user_id);

// workspace_id via RPC (mesmo que o app usa)
const wsRes = await fetch(`${URL_BASE}/rest/v1/rpc/get_my_workspace_id`, { method: 'POST', headers: AH, body: '{}' });
const workspace_id = (await wsRes.text()).replace(/"/g, '').trim();
console.log('\n🏢 get_my_workspace_id ->', wsRes.status, workspace_id);

async function tryInsert(label, assigned_to, withWs) {
  const body = {
    user_id: auth.user.id,
    project: `__TESTE_DIAG_${Date.now()}`,
    task: '__teste',
    priority: 3, status: 'todo', is_corporate: true,
    assigned_to,
    ...(withWs ? { workspace_id } : {}),
  };
  const r = await fetch(`${URL_BASE}/rest/v1/projects?select=id`, {
    method: 'POST', headers: { ...AH, Prefer: 'return=representation' }, body: JSON.stringify(body),
  });
  const txt = await r.text();
  console.log(`\n[${label}] assigned_to=${assigned_to} -> HTTP ${r.status}`);
  if (r.ok) {
    const id = JSON.parse(txt)[0]?.id;
    console.log('   ✅ inserido, limpando…', id);
    await fetch(`${URL_BASE}/rest/v1/projects?id=eq.${id}`, { method: 'DELETE', headers: AH });
  } else {
    console.log('   ❌', txt.slice(0, 300));
  }
}

await tryInsert('SEM workspace_id (como o form faz hoje)', null, false);
await tryInsert('COM workspace_id, sem colaborador', null, true);
if (collabs.length) await tryInsert('COM workspace_id + colaborador', collabs[0].member_user_id, true);
else console.log('\n(nenhum colaborador com member_user_id para testar)');