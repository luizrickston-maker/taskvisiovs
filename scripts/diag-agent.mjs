// Chama a edge function ai-360-agent como o app faz, com login real, e mostra a resposta.
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
if (!auth.access_token) { console.error('Login falhou:', JSON.stringify(auth)); process.exit(1); }
console.log('✅ Login OK');

// 1. Lista chaves de API ativas do usuário
const keys = await (await fetch(`${URL_BASE}/rest/v1/ai_api_keys?select=id,provider,is_active,api_key`, {
  headers: { ...H, Authorization: `Bearer ${auth.access_token}` },
})).json();
console.log('\n🔑 Chaves de API cadastradas:', Array.isArray(keys) ? keys.length : keys);
if (Array.isArray(keys)) keys.forEach(k => console.log(`   - ${k.provider} | ativa=${k.is_active} | key=${(k.api_key||'').slice(0,6)}...(${(k.api_key||'').length} chars)`));

// 2. Chama a edge function
const fn = process.env.DIAG_FN || 'ai-360-agent';
console.log(`\n📡 Chamando edge function: ${fn}`);
const r = await fetch(`${URL_BASE}/functions/v1/${fn}`, {
  method: 'POST',
  headers: { ...H, Authorization: `Bearer ${auth.access_token}` },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'como está minha agenda essa semana?' }] }),
});
console.log('HTTP', r.status, r.headers.get('content-type'));
const text = await r.text();
console.log(text.slice(0, 1500));