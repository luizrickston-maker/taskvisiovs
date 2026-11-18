// AUTH-05, cláusula "in the built bundle".
//
// O teste de unidade cobre `src/` e `vite.config.ts`; este script cobre o
// artefato que de fato vaza. Roda no fim do gate de Build, quando `dist/`
// acaba de ser produzido — assim não há teste condicional que passa em silêncio
// quando o bundle ainda não existe.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MARKER = 'FRAMEIO_CLIENT_SECRET';
const dir = 'dist/assets';

if (!existsSync(dir)) {
  console.error(`${dir} não existe — rode \`npm run build\` antes deste check.`);
  process.exit(1);
}

const offenders = readdirSync(dir)
  .filter((file) => file.endsWith('.js'))
  .filter((file) => readFileSync(join(dir, file), 'utf8').includes(MARKER));

if (offenders.length > 0) {
  console.error(`AUTH-05 violado: ${MARKER} encontrado em ${offenders.join(', ')}`);
  process.exit(1);
}

console.log(`AUTH-05 ok: ${MARKER} ausente de todos os bundles em ${dir}.`);
