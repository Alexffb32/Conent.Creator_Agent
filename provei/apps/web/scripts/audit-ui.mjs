// Auditoria rápida de UI: screenshots, scroll horizontal, alvos de toque e axe por viewport.
// Uso: BASE=http://localhost:3000 OUT=./shots node scripts/audit-ui.mjs /rota1 /rota2 ...
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, mkdirSync } from 'node:fs';

const base = process.env.BASE ?? 'http://localhost:3000';
const out = process.env.OUT ?? 'shots';
mkdirSync(out, { recursive: true });
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/'];
const viewports = [[360, 740], [390, 844], [768, 1024], [1440, 900]];
const executablePath = process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath });
let problems = 0;
for (const [w, h] of viewports) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-PT' });
  const page = await ctx.newPage();
  for (const r of routes) {
    await page.goto(base + r, { waitUntil: 'networkidle' });
    const name = `${r.replace(/[^a-z0-9]+/gi, '_') || 'home'}_${w}`;
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea')]
        .filter((el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && !el.closest('.sr-only, .maplibregl-ctrl') && b.height < 43.5; })
        .map((el) => `${el.tagName.toLowerCase()}「${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}」${Math.round(el.getBoundingClientRect().height)}px`));
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    const line = `${r} @${w}: overflow=${overflow} small=${small.length} axe=${serious.map((v) => `${v.id}(${v.nodes.length})`).join(',') || 'ok'}`;
    if (overflow > 1 || small.length || serious.length) problems++;
    console.log(line);
    if (small.length) console.log('   small:', small.slice(0, 6).join(' | '));
    for (const v of serious) console.log('   axe:', v.id, v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' || '));
  }
  await ctx.close();
}
await browser.close();
console.log(problems ? `\n${problems} combinações com problemas` : '\nSem problemas');
process.exit(problems ? 1 : 0);
