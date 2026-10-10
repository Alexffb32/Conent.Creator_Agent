import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { cleanup, createFixture, createUser, hasBackend, loginAs, uid, expectNoHorizontalScroll, admin } from './helpers';

const VIEWPORTS = [
  { name: '360x740', width: 360, height: 740 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x900', width: 1440, height: 900 },
];

test.skip(!hasBackend, 'Precisa de backend (ver README).');

for (const vp of VIEWPORTS) {
  test(`responsivo e acessível em ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const f = await createFixture();
    const email = `rsp-${uid()}@provei.test`;
    const userId = await createUser(email);
    try {
      const routes = ['/', '/descobrir', `/r/${f.slug}`, '/legal/termos', '/entrar'];
      for (const r of routes) {
        await page.goto(r);
        await page.waitForLoadState('networkidle');
        await expectNoHorizontalScroll(page);
        const small = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea')]
            .filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('.sr-only') && !el.classList.contains('sr-only') && (b.height < 43.5) && !(el instanceof HTMLInputElement && el.type === 'hidden'); })
            .map((el) => `${el.tagName}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}:${Math.round(el.getBoundingClientRect().height)}`),
        );
        expect(small, `alvos de toque < 44 px em ${r}`).toEqual([]);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
        const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(serious.map((v) => `${v.id}: ${v.nodes.length}`), `axe em ${r}`).toEqual([]);
      }
      // ecrãs autenticados
      await loginAs(page, f.ownerEmail, `/r/${f.slug}/admin`);
      for (const sub of ['', '/fila', '/mesas', '/publicacoes', '/plano']) {
        await page.goto(`/r/${f.slug}/admin${sub}`);
        await page.waitForLoadState('networkidle');
        await expectNoHorizontalScroll(page);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
        expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id), `axe painel${sub}`).toEqual([]);
      }
    } finally {
      await cleanup(f, [userId]);
      void admin;
    }
  });
}
