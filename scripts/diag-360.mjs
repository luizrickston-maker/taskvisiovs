// Diagnóstico: chama get_user_360_summary como usuário autenticado real
// Uso: DIAG_EMAIL=... DIAG_PASS=... node scripts/diag-360.mjs
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const URL_BASE = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EMAIL = process.env.DIAG_EMAIL;
const PASS = process.env.DIAG_PASS;

const H = { apikey: ANON, 'Content-Type': 'application/json' };

const login = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: H, body: JSON.stringify({ email: EMAIL, password: PASS }),
});
const auth = await login.json();
if (!auth.access_token) {
  console.error('❌ Login falhou:', JSON.stringify(auth));
  process.exit(1);
}
console.log('✅ Login OK — user_id:', auth.user.id);

const rpc = await fetch(`${URL_BASE}/rest/v1/rpc/get_user_360_summary`, {
  method: 'POST',
  headers: { ...H, Authorization: `Bearer ${auth.access_token}` },
  body: JSON.stringify({ p_user_id: auth.user.id }),
});
const text = await rpc.text();
console.log('\n--- RPC get_user_360_summary ---');
console.log('HTTP', rpc.status);
console.log(text.slice(0, 2000));