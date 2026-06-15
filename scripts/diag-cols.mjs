// Introspecção de colunas via PostgREST usando login real
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

const tables = process.env.DIAG_TABLES
  ? process.env.DIAG_TABLES.split(',')
  : ['corporate_costs', 'savings', 'debts'];

for (const t of tables) {
  const r = await fetch(`${URL_BASE}/rest/v1/${t.trim()}?select=*&limit=1`, { headers: AH });
  const rows = await r.json();
  console.log(`\n=== ${t.trim()} (HTTP ${r.status}) ===`);
  if (Array.isArray(rows) && rows.length) console.log('colunas:', Object.keys(rows[0]).join(', '));
  else console.log(JSON.stringify(rows).slice(0, 300));
}