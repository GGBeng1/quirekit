import { expect, test } from '@playwright/test';

test('category disclosures share geometry, indicators and draft-preserving dropdown behavior', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const toolbar = panel.getByRole('toolbar', { name: '公式模板' });
  const buttons = toolbar.locator('[data-qk-toolbar-item]');
  await expect(buttons).toHaveCount(11);
  const boxes = await buttons.evaluateAll(elements => elements.map(element => { const rect = element.getBoundingClientRect(); return [rect.x, rect.y, rect.width, rect.height]; }));
  for (const box of boxes) {
    expect(box[1]).toBeCloseTo(boxes[0]![1]!);
    expect(box[2]).toBeCloseTo(boxes[0]![2]!);
    expect(box[3]).toBeCloseTo(boxes[0]![3]!);
  }
  for (let i = 1; i < boxes.length; i++) expect(boxes[i]![0]! - boxes[i - 1]![0]!).toBeCloseTo(boxes[1]![0]! - boxes[0]![0]!);
  await expect(toolbar.locator('[data-kind="disclosure"] .qk-toolbar__indicator')).toHaveCount(11);
  const surface = panel.locator('.qk-math-input');
  await expect(surface).toHaveAttribute('data-ready', 'true');
  const before = await surface.boundingBox();
  const markup = await surface.locator('[data-mml-node="math"]').evaluate(element => element.outerHTML);
  for (const button of await buttons.all()) {
    await expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.qk-math-gallery[data-state="open"]')).toBeVisible();
    expect(await surface.locator('[data-mml-node="math"]').evaluate(element => element.outerHTML)).toBe(markup);
    expect(await surface.boundingBox()).toEqual(before);
    await page.getByRole('textbox', { name: '搜索所有公式模板' }).press('Escape');
    await expect(panel.getByLabel('可视化公式输入')).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  }
  await toolbar.getByRole('button', { name: '积分与微分', exact: true }).hover();
  await expect(page.getByRole('tooltip')).toContainText('积分与微分 · Integrals and derivatives');
  await toolbar.screenshot({ path: '../../.playwright-results/math-ui/category-toolbar.png' });
});

test('toolbar keyboard navigation opens a gallery then inserts at the retained formula caret', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const toolbar = panel.getByRole('toolbar', { name: '公式模板' });
  const first = toolbar.getByRole('button', { name: '分数、根式与角标', exact: true });
  const integral = toolbar.getByRole('button', { name: '积分与微分', exact: true });
  await first.focus(); await first.press('ArrowRight');
  await expect(integral).toBeFocused();
  await integral.press('ArrowDown');
  const search = page.getByRole('textbox', { name: '搜索所有公式模板' });
  await expect(search).toBeFocused();
  await search.fill('定积分'); await search.press('Enter');
  await expect(panel.getByLabel('可视化公式输入')).toBeFocused();
  await expect(panel.locator('[data-math-active-slot="root/0/lower"]')).toBeVisible();
  await expect(panel.getByLabel('LaTeX 源码', { exact: true })).not.toBeVisible();
});

test('narrow toolbar scrolls its final disclosure into view without wrapping or page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: '切换主题' }).click();
  const panel = page.getByRole('region', { name: '公式编辑' });
  const toolbar = panel.getByRole('toolbar', { name: '公式模板' });
  await expect(toolbar).toHaveAttribute('data-overflowing', 'true');
  const first = toolbar.getByRole('button', { name: '分数、根式与角标', exact: true });
  const last = toolbar.getByRole('button', { name: '常用公式', exact: true });
  await first.focus(); await first.press('End');
  await expect(last).toBeFocused();
  const viewport = (await toolbar.locator('[data-qk-toolbar-viewport]').boundingBox())!;
  const target = (await last.boundingBox())!;
  expect(target.x).toBeGreaterThanOrEqual(viewport.x - 1);
  expect(target.x + target.width).toBeLessThanOrEqual(viewport.x + viewport.width + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await last.press('ArrowDown');
  await expect(page.locator('.qk-math-gallery[data-state="open"]')).toBeVisible();
  await expect(page.getByRole('combobox', { name: '公式分类', exact: true })).toContainText('常用公式');
  await page.screenshot({ path: '../../.playwright-results/math-ui/preset-gallery-dark.png' });
  await page.getByRole('textbox', { name: '搜索所有公式模板' }).press('Escape');
  await expect(panel.getByLabel('可视化公式输入')).toBeFocused();
});
