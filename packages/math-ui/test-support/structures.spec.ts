import { expectMathText } from './layout';
import { expect, test } from '@playwright/test';
import { insertFormulaTemplate } from './palette';

test('authors a definite integral from limits to integrand without source syntax', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await insertFormulaTemplate(page, panel, '定积分', '积分与微分');
  await expect(panel.locator('[data-math-active-slot="root/0/lower"]')).toBeVisible();
  await input.pressSequentially('0'); await input.press('Tab');
  await input.pressSequentially('1'); await input.press('Tab');
  await input.pressSequentially('x');
  await insertFormulaTemplate(page, panel, '平方');
  await input.press('ArrowRight'); await input.pressSequentially('dx');
  await expectMathText(panel.locator('.qk-math-input [data-mml-node="msup"]'), 'x2');
  await expectMathText(panel.locator('[data-math-slot="root/0/lower"]'), '0');
  await expectMathText(panel.locator('[data-math-slot="root/0/upper"]'), '1');
  await expect(panel.getByLabel('LaTeX 源码', { exact: true })).not.toBeVisible();
  await panel.getByRole('button', { name: '确定', exact: true }).click();
  await expect(page.getByText('公式已保存', { exact: true })).toBeVisible();
  await panel.screenshot({ path: '../../.playwright-results/math-ui/definite-integral.png' });
});

test('discovers summation by Chinese command search and edits every structural role', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await panel.locator('.qk-math-input [data-math-placeholder]').click();
  await input.press('Backslash');
  const search = page.getByRole('textbox', { name: '搜索公式结构或符号' });
  await search.fill('求和');
  await page.locator('.qk-math-command').getByRole('button', { name: '求和', exact: true }).click();
  await input.pressSequentially('n=1'); await input.press('Tab');
  await input.pressSequentially('N'); await input.press('Tab');
  await input.pressSequentially('a');
  await insertFormulaTemplate(page, panel, '下标');
  await input.pressSequentially('n');
  await expectMathText(panel.locator('.qk-math-input [data-mml-node="munderover"]'), '∑n=1N');
  await expectMathText(panel.locator('[data-math-slot="root/0/body"]'), 'an');
  await expect(panel.getByLabel('LaTeX 源码', { exact: true })).not.toBeVisible();
  await panel.getByRole('button', { name: '确定', exact: true }).click();
  await expect(page.getByText('公式已保存', { exact: true })).toBeVisible();
  await panel.screenshot({ path: '../../.playwright-results/math-ui/summation.png' });
});

test('sequence gallery fills parameters, replaces existing indices and restores the caret', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  const before = await panel.locator('.qk-math-input').boundingBox();
  await panel.getByRole('button', { name: '数列与级数', exact: true }).click();
  const gallery = page.locator('.qk-math-gallery');
  await expect(gallery.getByRole('button', { name: '等差数列通项', exact: true })).toBeVisible();
  const floating = await page.locator('.qk-math-gallery[data-state="open"]').boundingBox();
  expect(floating!.y).toBeGreaterThanOrEqual(0);
  expect(floating!.y + floating!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await expect(panel.locator('.qk-math-input')).toHaveJSProperty('offsetHeight', before!.height);
  await page.screenshot({ path: '../../.playwright-results/math-ui/sequence-gallery.png' });
  await gallery.getByRole('button', { name: '等差数列通项', exact: true }).click();
  await expect(input).toBeFocused(); await input.pressSequentially('3');
  await expectMathText(panel.locator('.qk-math-input [data-mml-node="math"]'), 'an=a1+(n-1)3');
  await panel.locator('[data-math-slot="root/0/subscript"] [data-mml-node="mi"]').dblclick();
  await input.pressSequentially('k');
  await expectMathText(panel.locator('[data-math-slot="root/0/subscript"]'), 'k');
  await expect(panel.getByLabel('LaTeX 源码', { exact: true })).not.toBeVisible();
  await panel.getByRole('button', { name: '数列与级数', exact: true }).click();
  await page.getByRole('textbox', { name: '搜索所有公式模板' }).press('Escape');
  await expect(input).toBeFocused();
  await panel.getByRole('button', { name: '确定', exact: true }).click();
  await expect(page.getByText('公式已保存', { exact: true })).toBeVisible();
});

test('configures a matrix before insertion then edits cells by Tab and vertical navigation', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await panel.getByRole('button', { name: '矩阵与分段', exact: true }).click();
  await page.locator('.qk-math-gallery').getByRole('button', { name: '方括号矩阵', exact: true }).click();
  await page.getByRole('combobox', { name: '矩阵行数', exact: true }).click();
  await page.getByRole('option', { name: '3', exact: true }).click();
  await expect(page.getByLabel('矩阵预览').locator('[data-mml-node="mtr"]')).toHaveCount(3);
  await expect(panel.locator('.qk-math-input [data-mml-node="mtable"]')).toHaveCount(0);
  await page.getByRole('button', { name: '插入矩阵', exact: true }).click();
  await expect(input).toBeFocused();
  for (const value of ['1', '2', '3', '4', '5', '6']) {
    await input.pressSequentially(value);
    if (value !== '6') await input.press('Tab');
  }
  await input.press('ArrowUp'); await input.press('Home'); await input.press('Shift+ArrowRight');
  await input.pressSequentially('8');
  await expectMathText(panel.locator('.qk-math-input [data-mml-node="mtable"]'), '123856');
  await expect(panel.locator('.qk-math-input svg[data-math-renderer="mathjax"]')).toHaveCount(1);
  await expect(panel.locator('.qk-math-input svg text')).toHaveCount(0);
  const table = await panel.locator('.qk-math-input [data-mml-node="mtable"]').boundingBox();
  const bracket = await panel.locator('.qk-math-input [data-mml-node="mo"][data-math-text="["]').first().boundingBox();
  expect(bracket!.height).toBeGreaterThanOrEqual(table!.height - 1);
  const cells = panel.locator('.qk-math-input [data-mml-node="mtd"]');
  const prior = await cells.evaluateAll(elements => elements.map(element => { const r = element.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
  await panel.locator('[data-math-slot="root/0/cell-0-0"] [data-mml-node="mn"]').click();
  expect(await cells.evaluateAll(elements => elements.map(element => { const r = element.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }))).toEqual(prior);
  await expect(panel.getByLabel('LaTeX 源码', { exact: true })).not.toBeVisible();
  await panel.getByRole('button', { name: '确定', exact: true }).click();
  await expect(page.getByText('公式已保存', { exact: true })).toBeVisible();
  await panel.screenshot({ path: '../../.playwright-results/math-ui/matrix-editing.png' });
});

test('global gallery search and English command aliases insert nested functions', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await panel.getByRole('button', { name: '常用公式', exact: true }).click();
  const search = page.getByRole('textbox', { name: '搜索所有公式模板' });
  await search.fill('自然对数'); await search.press('Enter');
  await expect(input).toBeFocused(); await input.press('Backslash');
  const slash = page.getByRole('textbox', { name: '搜索公式结构或符号' });
  await slash.fill('log base'); await slash.press('Enter');
  await input.pressSequentially('2'); await input.press('Tab');
  await input.pressSequentially('x');
  await expectMathText(panel.locator('.qk-math-input [data-mml-node="mi"][data-math-text="ln"], .qk-math-input [data-mml-node="mi"][data-math-text="log"]'), ['ln', 'log']);
  await expectMathText(panel.locator('.qk-math-input [data-mml-node="math"]'), 'ln⁡log2⁡x');
  await expect(panel.getByLabel('LaTeX 源码', { exact: true })).not.toBeVisible();
  await input.press('ControlOrMeta+z');
  await expectMathText(panel.locator('[data-math-slot="root/0/argument/0/argument"]'), '□');
});

test('all category choices remain discoverable and usable in a narrow dark gallery', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 360, height: 900 });
  await page.getByRole('button', { name: '切换主题' }).click();
  const panel = page.getByRole('region', { name: '公式编辑' });
  await panel.getByRole('button', { name: '常用公式', exact: true }).click();
  await page.getByRole('combobox', { name: '公式分类', exact: true }).click();
  await page.getByRole('option', { name: '积分与微分', exact: true }).click();
  await expect(page.locator('.qk-math-gallery').getByRole('button', { name: '积分', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const gallery = await page.locator('.qk-math-gallery[data-state="open"]').boundingBox();
  expect(gallery!.x).toBeGreaterThanOrEqual(0); expect(gallery!.x + gallery!.width).toBeLessThanOrEqual(360);
  expect(gallery!.y).toBeGreaterThanOrEqual(0); expect(gallery!.y + gallery!.height).toBeLessThanOrEqual(900);
  await page.screenshot({ path: '../../.playwright-results/math-ui/calculus-gallery-dark.png' });
  await page.locator('.qk-math-gallery').getByRole('button', { name: '积分', exact: true }).click();
  await expect(panel.getByLabel('可视化公式输入')).toBeFocused();
  await panel.getByLabel('可视化公式输入').pressSequentially('f(x)');
  await expectMathText(panel.locator('.qk-math-input [data-mml-node="math"]'), '∫f(x)');
});
