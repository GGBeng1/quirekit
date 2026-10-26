import { expectMathText, expectPreviewsReady } from './layout';
import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

/**
 * Checks the actual mathematical paint bounds against each complete hit target.
 * @param grid - Visible gallery containing resident preview choices.
 * @returns Resolves after every preview fits its tile and adjacent rows remain separate.
 */
async function expectPreviewsToFit(grid: Locator): Promise<void> {
  await expectPreviewsReady(grid);
  const failures = await grid.locator('.qk-math-choice').evaluateAll(elements => elements.flatMap(element => {
    const button = element.getBoundingClientRect();
    const math = element.querySelector('svg[data-math-renderer="mathjax"]')!.getBoundingClientRect();
    const label = element.getAttribute('aria-label');
    const fits = math.top >= button.top + 3 && math.bottom <= button.bottom - 3 && math.left >= button.left + 2 && math.right <= button.right - 2;
    return fits ? [] : [{ label, button: [button.x, button.y, button.width, button.height], math: [math.x, math.y, math.width, math.height] }];
  }));
  expect(failures).toEqual([]);
  const rows = await grid.locator('.qk-math-choice').evaluateAll(elements => elements.map(element => { const r = element.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }));
  for (const row of rows) for (const other of rows) if (other.top > row.top + 1) expect(other.top - row.bottom).toBeGreaterThanOrEqual(3);
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 360, height: 540 }]) {
  test(`category previews fit their tiles without empty boxes at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto('/');
    if (viewport.width === 360) await page.getByRole('button', { name: '切换主题' }).click();
    const panel = page.getByRole('region', { name: '公式编辑' });
    const toolbar = panel.getByRole('toolbar', { name: '公式模板' });
    await expect(panel.locator('.qk-math-input')).toHaveAttribute('data-ready', 'true');
    const initial = await panel.locator('.qk-math-input [data-mml-node="math"]').evaluate(element => element.outerHTML);
    const heights: Record<string, number> = {};
    for (const button of await toolbar.locator('[data-qk-toolbar-item]').all()) {
      const label = (await button.getAttribute('aria-label'))!;
      await button.click();
      const gallery = page.locator('.qk-math-gallery[data-state="open"]');
      const grid = gallery.getByRole('group', { name: '公式模板图库' });
      await expect(grid.locator('[data-mml-node="math"]')).not.toHaveCount(0);
      await expectPreviewsToFit(grid);
      expect((await grid.locator('svg[data-math-renderer="mathjax"]').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')))).join('')).not.toContain('□');
      const bounds = (await gallery.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
      heights[label] = bounds.height;
      expect(await panel.locator('.qk-math-input [data-mml-node="math"]').evaluate(element => element.outerHTML)).toBe(initial);
      if (['求和与大型运算', '矩阵与分段', '函数与对数'].includes(label)) await page.screenshot({ path: `../../.playwright-results/math-ui/gallery-${label}-${viewport.width}.png` });
      await page.getByRole('textbox', { name: '搜索所有公式模板' }).press('Escape');
    }
    if (viewport.width === 1280) expect(heights['矩阵与分段']!).toBeGreaterThan(heights['括号与取整']! + 40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

test('matrix illustrations remain local and insertion still creates empty editable cells', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  await panel.getByRole('button', { name: '矩阵与分段', exact: true }).click();
  const gallery = page.locator('.qk-math-gallery[data-state="open"]');
  await expectPreviewsReady(gallery);
  await expect(gallery.getByRole('button', { name: '方括号矩阵', exact: true }).locator('svg')).not.toHaveAttribute('aria-label', /□/u);
  await gallery.getByRole('button', { name: '方括号矩阵', exact: true }).click();
  await expectPreviewsReady(page.getByLabel('矩阵预览'));
  await expect(page.getByLabel('矩阵预览').locator('svg')).not.toHaveAttribute('aria-label', /□/u);
  await expect(panel.locator('.qk-math-input [data-mml-node="mtable"]')).toHaveCount(0);
  await page.getByRole('button', { name: '插入矩阵', exact: true }).click();
  await expectMathText(panel.locator('.qk-math-input [data-mml-node="mtd"]'), ['□', '□', '□', '□']);
  await expect(panel.getByLabel('可视化公式输入')).toBeFocused();
  await panel.getByLabel('可视化公式输入').pressSequentially('z');
  await expectMathText(panel.locator('.qk-math-input [data-mml-node="mtd"]'), ['z', '□', '□', '□']);
});

test('a long gallery scrolls its choices while search and category stay visible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '函数与对数', exact: true }).click();
  const gallery = page.locator('.qk-math-gallery[data-state="open"]');
  const grid = gallery.getByRole('group', { name: '公式模板图库' });
  const search = page.getByRole('textbox', { name: '搜索所有公式模板' });
  const before = await search.boundingBox();
  const bounds = (await grid.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.wheel(0, 1000);
  await expect.poll(() => grid.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await search.boundingBox()).toEqual(before);
  await gallery.getByRole('button', { name: '任意底对数', exact: true }).click();
  const panel = page.getByRole('region', { name: '公式编辑' });
  await expectMathText(panel.locator('[data-math-slot="root/0/subscript"]'), '□');
  await expectMathText(panel.locator('[data-math-slot="root/0/argument"]'), '□');
});

test('slash search shares clean previews but inserts the original empty template', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await panel.locator('[data-math-placeholder]').click(); await input.press('Backslash');
  const search = page.getByRole('textbox', { name: '搜索公式结构或符号' });
  await search.fill('积分');
  const grid = page.getByRole('group', { name: '公式结构与符号' });
  await expectPreviewsToFit(grid);
  await expect(grid.locator('[data-math-placeholder]')).toHaveCount(0);
  await grid.getByRole('button', { name: '定积分', exact: true }).click();
  await expectMathText(panel.locator('[data-math-slot="root/0/lower"]'), '□');
  await expectMathText(panel.locator('[data-math-slot="root/0/upper"]'), '□');
  await expect(input).toBeFocused();
});
