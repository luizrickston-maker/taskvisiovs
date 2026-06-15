// Captura a resposta COMPLETA (texto montado) de uma edge function de IA.
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

async function callFn(fn) {
  const r = await fetch(`${URL_BASE}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { ...H, Authorization: `Bearer ${auth.access_token}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'liste meus compromissos desta semana' }] }),
  });
  const ct = r.headers.get('content-type') || '';
  if (!r.ok) { console.log(`\n[${fn}] HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`); return; }
  if (ct.includes('event-stream')) {
    const text = await r.text();
    let full = '';
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        const d = line.slice(6); if (d === '[DONE]') continue;
        try { full += JSON.parse(d).choices?.[0]?.delta?.content || ''; } catch {}
      }
    }
    console.log(`\n[${fn}] HTTP 200 — resposta montada:\n${full || '(VAZIO!)'}`);
  } else {
    console.log(`\n[${fn}] HTTP 200 (não-stream): ${(await r.text()).slice(0, 500)}`);
  }
}

for (const fn of (process.env.DIAG_FNS || 'ai-360-agent').split(',')) {
  await callFn(fn.trim());
}