// Gera os ícones PWA (192, 512, maskable) a partir de SVG com o Chromium do Playwright.
// Uso: node scripts/gen-icons.mjs   (substituir quando existir o kit oficial)
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(out, { recursive: true });

const svg = (size, maskable) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" ${maskable ? '' : 'rx="112"'} fill="#2D7F1A"/>
  <g transform="${maskable ? 'translate(76 76) scale(0.7)' : ''}">
    <text x="256" y="372" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="360" fill="#FFFFFF">P</text>
    <circle cx="370" cy="352" r="34" fill="#FFD60A"/>
  </g>
</svg>`;

const executablePath = process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage();
for (const [name, size, maskable] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['maskable-512.png', 512, true]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(size, maskable)}</body></html>`);
  await page.screenshot({ path: join(out, name), omitBackground: true });
}
await browser.close();
console.log('Ícones gerados em', out);
