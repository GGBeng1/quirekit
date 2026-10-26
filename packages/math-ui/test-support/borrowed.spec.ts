import { expect, test } from '@playwright/test';

test('Vue view borrows an external editor and keeps its state/history across view remounts', async ({ page }) => {
  await page.goto('/borrowed.html');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入'); await input.focus(); await input.pressSequentially('a');
  await expect(page.getByLabel('第一个核心')).toHaveText('xa');
  await page.getByRole('button', { name: '切换界面' }).click(); await expect(panel).toHaveCount(0);
  await page.getByRole('button', { name: '外部编辑' }).click(); await expect(page.getByLabel('第一个核心')).toHaveText('xay');
  await page.getByRole('button', { name: '切换界面' }).click(); await expect(panel.locator('.qk-math-input')).toHaveAttribute('data-ready', 'true');
  await input.focus(); await input.press('ControlOrMeta+z'); await expect(page.getByLabel('第一个核心')).toHaveText('xa');
});

test('Vue adapter switches the borrowed instance without retaining previous selection or event subscriptions', async ({ page }) => {
  await page.goto('/borrowed.html');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入'); await input.focus(); await input.pressSequentially('a');
  await page.getByRole('button', { name: '切换实例' }).click(); await expect(panel.locator('.qk-math-input')).toHaveAttribute('data-ready', 'true');
  await input.focus(); await input.press('ControlOrMeta+a'); await input.pressSequentially('b');
  await expect(page.getByLabel('第二个核心')).toHaveText('b'); await expect(page.getByLabel('第一个核心')).toHaveText('xa');
  await page.getByRole('button', { name: '外部编辑' }).click(); await expect(page.getByLabel('第一个核心')).toHaveText('xay');
  await expect(panel.locator('.qk-math-input [data-mml-node="math"]')).toHaveAttribute('data-math-text', 'b');
  await page.getByRole('button', { name: '切换实例' }).click(); await input.focus(); await input.pressSequentially('c');
  await expect(page.getByLabel('第一个核心')).toHaveText('xayc'); await expect(page.getByLabel('第二个核心')).toHaveText('b');
});

test('a late commit from the previous instance cannot acknowledge the current Vue view', async ({ page }) => {
  await page.goto('/borrowed.html');
  const panel = page.getByRole('region', { name: '公式编辑' });
  await expect(panel.locator('.qk-math-input')).toHaveAttribute('data-ready', 'true');
  const input = panel.getByLabel('可视化公式输入'); await input.focus(); await input.pressSequentially('a');
  await panel.getByRole('button', { name: '确定', exact: true }).click(); await expect(panel).toHaveAttribute('aria-busy', 'true');
  await page.getByRole('button', { name: '切换实例' }).click(); await expect(panel).toHaveAttribute('aria-busy', 'false');
  await expect(panel.locator('.qk-math-input')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: '完成保存' }).click();
  await expect(page.getByLabel('第一个核心')).toHaveAttribute('data-dirty', 'false');
  await expect(page.getByLabel('界面完成事件')).toHaveText('0');
  await panel.getByRole('button', { name: '确定', exact: true }).click();
  await expect(page.getByLabel('界面完成事件')).toHaveText('1');
});
