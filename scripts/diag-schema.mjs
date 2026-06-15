// Lê o schema das tabelas pela definição OpenAPI do PostgREST
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const URL_BASE = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

const login = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: process.env.DIAG_EMAIL, password: process.env.DIAG_PASS }),
});
const auth = await login.json();

const r = await fetch(`${URL_BASE}/rest/v1/`, {
  headers: { apikey: ANON, Authorization: `Bearer ${auth.access_token}` },
});
const spec = await r.json();
const tables = (process.env.DIAG_TABLES || 'corporate_costs,savings,debts').split(',').map(s => s.trim());

for (const t of tables) {
  const def = spec.definitions?.[t];
  console.log(`\n=== ${t} ===`);
  if (def?.properties) console.log('colunas:', Object.keys(def.properties).join(', '));
  else console.log('(tabela não encontrada na spec)');
}