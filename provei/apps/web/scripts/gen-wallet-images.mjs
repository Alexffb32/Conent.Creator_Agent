// Gera as imagens do cartão Wallet (icon, logo, strip @1x/@2x/@3x) a partir do logótipo provisório,
// com o Chromium do Playwright, e escreve-as em base64 em src/server/wallet/assets.ts.
// Uso: node scripts/gen-wallet-images.mjs   (substituir quando existir o kit oficial; ver ASSETS.md)
import { chromium } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'server', 'wallet', 'assets.ts');
const mark = (fill, dot) => `<text x="256" y="372" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="360" fill="${fill}">P</text><circle cx="370" cy="352" r="34" fill="${dot}"/>`;
const svgs = {
  icon: (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#2D7F1A"/>${mark('#FFFFFF', '#FFD60A')}</svg>`,
  logo: (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 160 50"><svg x="0" y="0" width="50" height="50" viewBox="0 0 512 512">${mark('#FFFFFF', '#FFD60A')}</svg></svg>`,
  strip: (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 375 123"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2D7F1A"/><stop offset="1" stop-color="#1F5E12"/></linearGradient></defs><rect width="375" height="123" fill="url(#g)"/><circle cx="330" cy="96" r="58" fill="#7BC62D" opacity="0.25"/><circle cx="352" cy="30" r="10" fill="#FFD60A" opacity="0.9"/></svg>`,
};
const sizes = { icon: [29, 29], logo: [160, 50], strip: [375, 123] };

const executablePath = process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage();
const files = {};
for (const [name, [w, h]] of Object.entries(sizes)) {
  for (const scale of [1, 2, 3]) {
    const W = w * scale, H = h * scale;
    await page.setViewportSize({ width: W, height: H });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svgs[name](W, H)}</body></html>`);
    const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
    files[`${name}${scale === 1 ? '' : `@${scale}x`}.png`] = buf.toString('base64');
  }
}
await browser.close();
writeFileSync(out, `// Gerado por scripts/gen-wallet-images.mjs — não editar à mão. Logótipo provisório (ver ASSETS.md).\nexport const WALLET_IMAGES: Record<string, string> = ${JSON.stringify(files, null, 2)};\n`);
console.log('Imagens do cartão em', out, Object.keys(files).join(', '));
