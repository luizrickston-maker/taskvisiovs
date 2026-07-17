import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:8080';
const EMAIL = 'ludomotion@gmail.com';
const PASS  = '1234567Ll';
const SS    = (name) => `C:/Users/Luis Henrique/Documents/taskvisionpro/verify-ss-${name}.png`;

const browser = await chromium.launch({ headless: true });
const page    = await browser.newPage({ viewport: { width: 1280, height: 800 } });

console.log('1. Abrindo app...');
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.screenshot({ path: SS('01-inicio') });

console.log('2. Login...');
// preenche email
const emailInput = await page.locator('input[type="email"], input[placeholder*="mail"], input[name="email"]').first();
await emailInput.fill(EMAIL);
const passInput = await page.locator('input[type="password"]').first();
await passInput.fill(PASS);
await page.screenshot({ path: SS('02-form-preenchido') });
await passInput.press('Enter');

// aguarda redirect pós-login
await page.waitForURL(url => !url.includes('/auth'), { timeout: 15000 }).catch(() => {});
await page.waitForLoadState('networkidle');
await page.screenshot({ path: SS('03-pos-login') });
console.log('   URL após login:', page.url());

console.log('3. Navegando para /colaborador...');
await page.goto(`${BASE}/colaborador`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: SS('04-colaborador-full') });

// Captura mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: SS('05-colaborador-mobile') });
await page.setViewportSize({ width: 1280, height: 800 });

// Toggle tema (clica no botão sol/lua)
const themeBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
const themeBtns = await page.locator('header button').all();
console.log(`   Botões no header: ${themeBtns.length}`);

// Testa light mode
const headerButtons = page.locator('header').locator('button');
const btnCount = await headerButtons.count();
if (btnCount > 0) {
  await headerButtons.first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: SS('06-tema-alternado') });
}

// Verifica elementos presentes
const indicadorTexto = await page.locator('text=/Ao vivo|Conectando|Offline/i').first().textContent().catch(() => 'não encontrado');
const temHoje = await page.locator('text=/Para Hoje/i').isVisible().catch(() => false);
const temBriefing = await page.locator('button:has-text("Briefing")').count().catch(() => 0);
const temProgresso = await page.locator('[role="progressbar"]').count().catch(() => 0);
const temProjetos = await page.locator('text=/Projetos sob/i').isVisible().catch(() => false);
const temTarefas = await page.locator('text=/Minhas Tarefas/i').isVisible().catch(() => false);

console.log('--- RESULTADO ---');
console.log('Indicador real-time:', indicadorTexto);
console.log('Seção "Para Hoje" visível:', temHoje);
console.log('Botões "Briefing" encontrados:', temBriefing);
console.log('Barras de progresso:', temProgresso);
console.log('Seção "Projetos" visível:', temProjetos);
console.log('Seção "Tarefas" visível:', temTarefas);

await browser.close();
console.log('Screenshots salvas: verify-ss-*.png');