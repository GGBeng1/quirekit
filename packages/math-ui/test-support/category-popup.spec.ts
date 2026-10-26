import { expect, test } from '@playwright/test';

for (const narrow of [false, true]) {
  test(`category options use a separate popup with selected state at ${narrow ? 'narrow dark' : 'wide light'} size`, async ({ page }, info) => {
    await page.setViewportSize(narrow ? { width: 360, height: 650 } : { width: 1280, height: 800 });
    await page.goto('/');
    if (narrow) await page.getByRole('button', { name: '切换主题' }).click();
    const panel = page.getByRole('region', { name: '公式编辑' });
    const toolbar = panel.getByRole('toolbar', { name: '公式模板' });
    const trigger = toolbar.getByRole('button', { name: '常用公式', exact: true });
    if (narrow) { await toolbar.getByRole('button', { name: '分数、根式与角标', exact: true }).focus(); await page.keyboard.press('End'); }
    await trigger.click();
    const gallery = page.locator('.qk-math-gallery[data-state="open"]');
    const category = gallery.getByRole('combobox', { name: '公式分类', exact: true });
    await category.click();
    const options = page.getByRole('listbox', { name: '公式分类', exact: true });
    await expect(options).toBeVisible();
    expect(await options.evaluate(element => !!element.closest('.qk-math-gallery'))).toBe(false);
    await expect(options.getByRole('option', { name: '常用公式', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(options.getByRole('option', { name: '常用公式', exact: true }).locator('[data-part="item-indicator"]')).toBeVisible();
    await expect(options.getByRole('option', { name: '常用公式', exact: true })).toBeInViewport({ ratio: 1 });
    expect(await options.evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(180);
    const bounds = await options.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await expect.poll(() => category.locator('[data-part="indicator"]').evaluate(element => element.getAnimations().length)).toBe(0);
    await page.screenshot({ path: info.outputPath('category-popup.png') });
    await page.keyboard.press('Home');
    await expect(options.getByRole('option', { name: '分数、根式与角标', exact: true })).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('End');
    await expect(options.getByRole('option', { name: '常用公式', exact: true })).toBeInViewport({ ratio: 1 });
    await options.getByRole('option', { name: '积分与微分', exact: true }).click();
    await expect(options).not.toBeVisible();
    await expect(gallery).toBeVisible();
    await expect(category).toContainText('积分与微分');
    await expect(gallery.getByRole('button', { name: '定积分', exact: true })).toBeVisible();
    await expect(category).toBeFocused();
    await category.press('ArrowDown');
    await expect(options.getByRole('option', { name: '积分与微分', exact: true })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Escape');
    await expect(options).not.toBeVisible();
    await expect(gallery).toBeVisible();
    await expect(category).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(gallery).not.toBeVisible();
    await expect(panel.getByLabel('可视化公式输入')).toBeFocused();
    await trigger.click();
    await category.click();
    await page.getByRole('heading', { name: '公式编辑', exact: true }).click();
    await expect(options).not.toBeVisible();
    await expect(gallery).not.toBeVisible();
  });
}
