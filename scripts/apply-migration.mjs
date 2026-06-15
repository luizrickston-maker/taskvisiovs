// Aplica um arquivo .sql ao banco usando host/usuário do pooler do CLI + senha via env.
// Uso: DB_PASSWORD='...' node scripts/apply-migration.mjs <caminho-do-sql>
import { readFileSync } from 'node:fs';
import pg from 'pg';

const sqlPath = process.argv[2];
if (!sqlPath) { console.error('Informe o caminho do .sql'); process.exit(1); }
if (!process.env.DB_PASSWORD) { console.error('Defina DB_PASSWORD'); process.exit(1); }

const raw = readFileSync(new URL('../supabase/.temp/pooler-url', import.meta.url), 'utf8').trim();
const u = new URL(raw.replace(/[?&]sslmode=[^&]*/g, ''));

const client = new pg.Client({
  host: u.hostname,
  port: Number(u.port || 5432),
  user: decodeURIComponent(u.username),     // ex: postgres.<ref>
  password: process.env.DB_PASSWORD,        // senha crua, sem encoding
  database: u.pathname.replace(/^\//, '') || 'postgres',
  ssl: { rejectUnauthorized: false },
});

const sql = readFileSync(sqlPath, 'utf8');
try {
  await client.connect();
  await client.query(sql);
  console.log('✅ Migration aplicada com sucesso:', sqlPath);
} catch (e) {
  console.error('❌ Erro ao aplicar:', e.message);
  process.exit(1);
} finally {
  await client.end();
}