import { expectMathText, expectPreviewsReady } from './layout';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/**
 * Reads ink at either side of the engine's surd/overbar join, independent of DOM box height.
 * @param page - Browser decoding the isolated formula screenshot.
 * @param radical - One square or indexed root with the controlled presentation base.
 * @returns Difference between the two top ink edges, in screenshot pixels.
 */
async function radicalJoinStep(page: Page, radical: Locator): Promise<number> {
  const bounds = (await radical.boundingBox())!;
  const overbar = (await radical.locator(':scope > rect').boundingBox())!;
  const foreground = await radical.evaluate(element => getComputedStyle(element).color.match(/[\d.]+/g)!.slice(0, 3).map(Number));
  const bytes = await radical.screenshot({ path: `../../.playwright-results/math-ui/radical-pixel-${test.info().title.includes('dark') ? 'dark' : 'light'}.png` });
  await test.info().attach('radical-ink', { body: bytes, contentType: 'image/png' });
  const png = bytes.toString('base64');
  return page.evaluate(async ({ png, junction, foreground }) => {
    const bytes = Uint8Array.from(atob(png), character => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    bitmap.close();
    const tops = [-1, 1].map(offset => {
      const x = Math.round(junction + offset);
      for (let y = 0; y < canvas.height; y++) {
        const index = (y * canvas.width + x) * 4;
        const distance = foreground.reduce((sum, value, channel) => sum + (pixels[index + channel]! - value) ** 2, 0);
        if (distance < 2500 && pixels[index + 3]! > 180) return y;
      }
      throw new Error(`No radical join ink found at ${x} of ${canvas.width}, foreground ${foreground}`);
    });
    return Math.abs(tops[0]! - tops[1]!);
  }, { png, junction: overbar.x - bounds.x, foreground });
}

for (const dark of [false, true]) {
  test(`enlarged SVG radicals have a smooth join in ${dark ? 'dark' : 'light'} formulas`, async ({ page }) => {
    await page.goto('/?size=128');
    if (dark) await page.getByRole('button', { name: '切换主题' }).click();
    const panel = page.getByRole('region', { name: '公式编辑' });
    await panel.getByRole('button', { name: 'LaTeX 源码（可选）', exact: true }).click();
    for (const [name, source] of [
      ['square', String.raw`\sqrt{x}`], ['indexed', String.raw`\sqrt[n]{x}`],
      ['fraction', String.raw`\sqrt{\frac{a}{b}}`], ['nested', String.raw`\sqrt{\sqrt{x}}`],
    ]) {
      await panel.getByLabel('LaTeX 源码', { exact: true }).fill(source!);
      await expect(panel.locator('.qk-math-input')).toHaveAttribute('data-ready', 'true');
      const roots = panel.locator('.qk-math-input [data-mml-node="msqrt"], .qk-math-input [data-mml-node="mroot"]');
      // One CSS pixel on either side includes the font's curved shoulder; reject a discrete step.
      for (const root of await roots.all()) expect(await radicalJoinStep(page, root), `${name} radical join`).toBeLessThanOrEqual(2);
      await page.screenshot({ path: `../../.playwright-results/math-ui/radical-join-${name}-${dark ? 'dark' : 'light'}.png` });
    }
  });
}

for (const dark of [false, true]) {
  test(`small SVG radicals fit their contents in ${dark ? 'dark' : 'light'} previews`, async ({ page }) => {
    await page.goto('/');
    if (dark) await page.getByRole('button', { name: '切换主题' }).click();
    await page.getByRole('button', { name: '分数、根式与角标', exact: true }).click();
    const gallery = page.locator('.qk-math-gallery[data-state="open"]');
    await expectPreviewsReady(gallery);
    for (const label of ['平方根', '立方根', '任意次根']) {
      const root = gallery.getByRole('button', { name: label, exact: true }).locator('[data-mml-node="msqrt"], [data-mml-node="mroot"]');
      await expect.poll(() => root.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const content = element.querySelector('[data-math-radicand] [data-mml-node="mi"]')!.getBoundingClientRect();
        return (bounds.bottom - content.bottom) / parseFloat(getComputedStyle(element).fontSize);
      })).toBeLessThan(0.35);
      await expectMathText(root.locator('[data-math-radicand] [data-mml-node="mi"]').first(), 'x');
    }
    await page.screenshot({ path: `../../.playwright-results/math-ui/radical-gallery-${dark ? 'dark' : 'light'}.png` });
  });
}

test('nested radicals keep SVG stretch, editing and selection work isolated', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  await panel.getByRole('button', { name: 'LaTeX 源码（可选）', exact: true }).click();
  await panel.getByLabel('LaTeX 源码', { exact: true }).fill(String.raw`x+\sqrt{x}+\sqrt[3]{x}+\sqrt[n]{\frac{a}{b}}+\sqrt{\sqrt{x^2+1}}`);
  const surface = panel.locator('.qk-math-input');
  await expect(surface).toHaveAttribute('data-ready', 'true');
  await expect(surface.locator('[data-mml-node="msqrt"]')).toHaveCount(3);
  await expect(surface.locator('[data-mml-node="mroot"]')).toHaveCount(2);
  const before = await surface.getAttribute('data-layouts');
  const inner = surface.locator('[data-mml-node="msqrt"] [data-mml-node="msqrt"]');
  expect((await inner.boundingBox())!.height).toBeGreaterThan(20);
  const fraction = surface.locator('[data-mml-node="mroot"]').last();
  expect((await fraction.boundingBox())!.height).toBeGreaterThan((await surface.locator('[data-mml-node="mroot"]').first().boundingBox())!.height);
  const glyph = surface.locator('[data-mml-node="msqrt"]').first().locator('[data-mml-node="mi"]').first();
  await glyph.dblclick();
  await expect(surface.locator('.qk-math-overlay__selection')).not.toHaveCount(0);
  expect(await surface.getAttribute('data-layouts')).toBe(before);
  await panel.getByLabel('可视化公式输入').pressSequentially('z');
  await expectMathText(surface.locator('[data-mml-node="msqrt"]').first().locator('[data-mml-node="mi"]'), 'z');
  await page.screenshot({ path: '../../.playwright-results/math-ui/radical-editing.png' });
});
