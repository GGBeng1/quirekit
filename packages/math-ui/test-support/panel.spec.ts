import { expectMathText } from './layout';
import { expect, test } from '@playwright/test';
import { insertFormulaTemplate } from './palette';

test('creates and edits nested formulas with source hidden throughout', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await expect(panel.getByLabel('LaTeX 源码', { exact: true })).not.toBeVisible();
  await insertFormulaTemplate(page, panel, '分数');
  await expect(panel.locator('[data-math-placeholder]')).toHaveCount(2);
  await expect(input).toBeFocused();
  await input.pressSequentially('x+1');
  await expectMathText(panel.locator('[data-math-slot="root/0/numerator"]'), 'x+1');
  await input.press('ArrowDown');
  await insertFormulaTemplate(page, panel, '平方根');
  await input.pressSequentially('y');
  await insertFormulaTemplate(page, panel, '上标');
  await input.pressSequentially('2');
  await expect(panel.locator('.qk-math-input').locator('[data-mml-node="mfrac"] [data-mml-node="msqrt"] [data-mml-node="msup"]')).toHaveCount(1);
  await expectMathText(panel.locator('[data-math-slot="root/0/denominator/0/radicand/0/superscript"]'), '2');
  await panel.getByRole('button', { name: '确定', exact: true }).click();
  await expect(page.getByText('公式已保存', { exact: true })).toBeVisible();
  await expect(panel.getByLabel('LaTeX 源码', { exact: true })).not.toBeVisible();
  await panel.screenshot({ path: '../../.playwright-results/math-ui/visual-nested.png' });
});

test('clicks empty slots, replaces selections and deletes complete structures safely', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await insertFormulaTemplate(page, panel, '分数');
  await panel.locator('[data-math-slot="root/0/denominator"] [data-math-placeholder]').click();
  await input.pressSequentially('23');
  await input.press('Home'); await input.press('Shift+ArrowRight');
  await expect(panel.locator('[data-math-selected]')).toHaveCount(1);
  await input.pressSequentially('4');
  await expectMathText(panel.locator('[data-math-slot="root/0/denominator"]'), '43');
  await input.press('Tab');
  await input.press('End');
  await input.press('Backspace');
  await expect(panel.locator('.qk-math-input').locator('[data-mml-node="mfrac"]')).toHaveCount(1);
  await expect(panel.locator('[data-math-selected]')).toHaveCount(1);
  await input.press('Backspace');
  await expect(panel.locator('.qk-math-input').locator('[data-mml-node="mfrac"]')).toHaveCount(0);
  await input.press('ControlOrMeta+z');
  await expect(panel.locator('.qk-math-input').locator('[data-mml-node="mfrac"]')).toHaveCount(1);
});

test('retains host failure drafts and isolates instances, source and conflicts', async ({ page }) => {
  await page.goto('/?test=1');
  const panels = page.getByRole('region', { name: '公式编辑' });
  const first = panels.first();
  const input = first.getByLabel('可视化公式输入');
  await first.locator('.qk-math-input [data-mml-node="mi"]').click();
  await input.press('ControlOrMeta+a');
  await input.pressSequentially('y');
  await first.getByRole('button', { name: '确定', exact: true }).click();
  await expect(first.getByRole('status')).toHaveText('公式未保存，草稿已保留');
  await expectMathText(panels.last().locator('.qk-math-input [data-mml-node="mi"]'), 'z');
  await first.getByRole('button', { name: 'LaTeX 源码（可选）', exact: true }).click();
  const source = first.getByLabel('LaTeX 源码', { exact: true });
  await source.fill(String.raw`\bad`);
  await expect(first.getByRole('button', { name: '确定', exact: true })).toBeDisabled();
  await expect(input).toBeDisabled();
  await expectMathText(first.locator('.qk-math-input [data-mml-node="mi"]'), 'y');
  await first.getByRole('button', { name: '取消', exact: true }).click();
  await expect(source).toHaveValue('x');
  await source.fill('b');
  await page.getByRole('button', { name: '外部修改公式' }).click();
  await expect(input).toBeDisabled();
  await first.getByRole('button', { name: '放弃草稿并重新载入' }).click();
  await expect(source).toHaveValue('a');
});

test('symbols, composition and narrow dark theme work in the visual input', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await panel.locator('[data-math-placeholder]').click();
  await input.pressSequentially('x+');
  await panel.getByRole('button', { name: '希腊字母', exact: true }).click();
  await page.getByRole('button', { name: '阿尔法', exact: true }).click();
  await expect(input).toBeFocused();
  await expectMathText(panel.locator('.qk-math-input [data-mml-node="math"]'), 'x+α');
  await input.evaluate(element => {
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    element.dispatchEvent(new CompositionEvent('compositionend', { data: 'β', bubbles: true }));
  });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => navigator.clipboard.writeText('γ'));
  await input.press('ControlOrMeta+v');
  await expectMathText(panel.locator('.qk-math-input [data-mml-node="math"]'), 'x+αβγ');
  await expectMathText(panel.locator('.qk-math-input [data-mml-node="math"]'), 'x+αβγ');
  const light = await panel.evaluate(element => getComputedStyle(element).color);
  await page.getByRole('button', { name: '切换主题' }).click();
  await expect.poll(() => panel.evaluate(element => getComputedStyle(element).color)).not.toBe(light);
  await page.setViewportSize({ width: 360, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await panel.screenshot({ path: '../../.playwright-results/math-ui/visual-dark-narrow.png' });
});

test('slash search creates nested structures and restores the caret on cancel', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await panel.locator('[data-math-placeholder]').click();
  await input.press('Backslash');
  const search = page.getByRole('textbox', { name: '搜索公式结构或符号' });
  await expect(search).toBeFocused();
  await search.fill('分数'); await search.press('Enter');
  await expect(input).toBeFocused();
  await input.pressSequentially('x'); await input.press('Backslash');
  await search.fill('平方');
  await page.locator('.qk-math-command').getByRole('button', { name: '平方', exact: true }).click();
  await expect(panel.locator('.qk-math-input').locator('[data-mml-node="mfrac"] [data-mml-node="msup"]')).toHaveCount(1);
  await input.press('ArrowDown'); await input.press('Backslash');
  await search.fill('sqrt'); await search.press('Enter');
  await input.pressSequentially('y');
  await input.press('Backslash'); await search.press('Escape');
  await expect(input).toBeFocused(); await input.pressSequentially('+1');
  await expectMathText(panel.locator('.qk-math-input').locator('[data-mml-node="msqrt"]'), 'y+1');
  await expect(panel.getByLabel('LaTeX 源码', { exact: true })).not.toBeVisible();
  await expect(panel.locator('.qk-math-input svg')).not.toHaveAttribute('aria-label', /\//u);
  await panel.screenshot({ path: '../../.playwright-results/math-ui/slash-menu-formula.png' });
});

test('shared IME projects preedit without editing and consumes duplicate commits and trailing deletion', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await panel.locator('[data-math-placeholder]').click();
  await input.evaluate(element => {
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    element.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'β', bubbles: true }));
  });
  await expect(panel.locator('.qk-math-input__preedit')).toHaveText('β');
  await expect(panel.locator('.qk-math-input [data-mml-node="mi"]')).toHaveCount(0);
  await input.evaluate(element => {
    element.dispatchEvent(new CompositionEvent('compositionend', { data: 'β', bubbles: true }));
    element.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertFromComposition', data: 'β', bubbles: true, cancelable: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
  });
  await expectMathText(panel.locator('.qk-math-input [data-mml-node="math"]'), 'β');
  await expect(panel.locator('.qk-math-input__preedit')).toHaveCount(0);
});

test('moving the caret between nested slots never moves formula glyphs', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  await panel.getByRole('button', { name: 'LaTeX 源码（可选）', exact: true }).click();
  await panel.getByLabel('LaTeX 源码', { exact: true }).fill(String.raw`\frac{x_1}{\sqrt[3]{y^2}}+z`);
  await expect(panel.locator('.qk-math-input')).toHaveAttribute('data-ready', 'true');
  const glyphs = panel.locator('.qk-math-input').locator('[data-mml-node="mi"], [data-mml-node="mn"], [data-mml-node="mo"], [data-math-placeholder]');
  const rectangles = () => glyphs.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return [rect.x, rect.y, rect.width, rect.height];
  }));
  const baseline = await rectangles();
  expect(baseline.length).toBeGreaterThan(5);
  for (const glyph of await glyphs.all()) {
    await glyph.click();
    await expect(panel.getByLabel('可视化公式输入')).toBeFocused();
    expect(await rectangles()).toEqual(baseline);
  }
  await panel.getByLabel('可视化公式输入').press('Escape');
  expect(await rectangles()).toEqual(baseline);
});

test('empty caret sits inside its box and filled slots retain an editing outline', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  await insertFormulaTemplate(page, panel, '分数');
  const slot = panel.locator('[data-math-slot="root/0/numerator"]');
  const box = await slot.locator('[data-math-placeholder]').boundingBox();
  const caret = await panel.locator('.qk-math-input__caret').boundingBox();
  expect(caret!.x).toBeGreaterThan(box!.x);
  expect(caret!.x).toBeLessThan(box!.x + box!.width);
  await panel.getByLabel('可视化公式输入').pressSequentially('12');
  const outline = panel.locator('.qk-math-overlay__slot');
  await expect(outline).toHaveAttribute('data-math-active-slot', 'root/0/numerator');
  expect(await outline.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('dashed');
  await expect(slot.locator('[data-math-placeholder]')).toHaveCount(0);
  const input = panel.getByLabel('可视化公式输入');
  await input.press('Home'); await input.press('Shift+ArrowRight'); await input.pressSequentially('3');
  await expectMathText(slot, '32');
});


test('visual formula palette shows bilingual hover hints in the component popover', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-math-placeholder]').click();
  await page.getByLabel('可视化公式输入').press('Backslash');
  const palette = page.locator('.qk-math-command');
  const root = palette.getByRole('button', { name: '平方根', exact: true });
  await expect(root.locator('[data-mml-node="msqrt"]')).toHaveCount(1);
  await root.hover();
  await expect(page.getByRole('tooltip')).toContainText('平方根 · Square root');
  await page.screenshot({ path: '../../.playwright-results/math-ui/visual-palette.png' });
  await page.getByRole('textbox', { name: '搜索公式结构或符号' }).press('Escape');
  await page.getByRole('button', { name: '切换主题' }).click();
  await page.setViewportSize({ width: 360, height: 900 });
  await page.getByLabel('可视化公式输入').press('Backslash');
  await expect(page.getByRole('textbox', { name: '搜索公式结构或符号' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.screenshot({ path: '../../.playwright-results/math-ui/visual-palette-dark.png' });
  await page.getByRole('textbox', { name: '搜索公式结构或符号' }).fill('alpha');
  await expect(palette.locator('.qk-math-choice')).toHaveCount(1);
  await page.getByRole('textbox', { name: '搜索公式结构或符号' }).press('Enter');
  await expect(page.getByLabel('可视化公式输入')).toBeFocused();
  await expectMathText(page.getByRole('region', { name: '公式编辑' }).locator('.qk-math-input [data-mml-node="math"]'), 'α');
});

test('overlay drag selection tracks intermediate frames without rebuilding formula DOM', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  await panel.locator('[data-math-placeholder]').click();
  const input = panel.getByLabel('可视化公式输入');
  await input.pressSequentially('abcde');
  const glyphs = panel.locator('.qk-math-input [data-mml-node="mi"]');
  const first = (await glyphs.first().boundingBox())!;
  const middle = (await glyphs.nth(2).boundingBox())!;
  const last = (await glyphs.last().boundingBox())!;
  const math = panel.locator('.qk-math-input [data-mml-node="math"]');
  await math.evaluate(element => { element.setAttribute('data-retained-test', 'yes'); });
  await page.mouse.move(first.x + 1, first.y + first.height / 2); await page.mouse.down();
  await page.mouse.move(middle.x + middle.width - 1, middle.y + middle.height / 2, { steps: 6 });
  await expect(panel.locator('.qk-math-overlay__selection')).toHaveCount(3);
  await page.mouse.move(last.x + last.width - 1, last.y + last.height / 2, { steps: 6 }); await page.mouse.up();
  await expect(panel.locator('.qk-math-overlay__selection')).toHaveCount(5);
  await expect(math).toHaveAttribute('data-retained-test', 'yes');
  await expect(panel.locator('.qk-math-input__caret')).toHaveCount(0);
  await panel.screenshot({ path: '../../.playwright-results/math-ui/overlay-selection.png' });
  await input.pressSequentially('x'); await expectMathText(math, 'x');
  await input.press('ControlOrMeta+z'); await expectMathText(math, 'abcde');
  await input.press('ArrowRight');
  const caret = panel.locator('.qk-math-input__caret');
  await expect(caret).toBeVisible();
  expect(await caret.evaluate(element => getComputedStyle(element).animationName)).toBe('qk-math-caret-blink');
  // Sample real frames across a full blink period; sparse retries can alias the phase.
  const phases = await caret.evaluate(async element => {
    const values = new Set<string>(); const started = performance.now();
    while (performance.now() - started < 1500 && values.size < 2) {
      values.add(getComputedStyle(element).opacity);
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    return [...values];
  });
  expect(phases).toEqual(expect.arrayContaining(['0', '1']));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await caret.evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});

test('cross-slot drag selects a whole fraction and deletion remains reversible', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  await panel.getByRole('button', { name: 'LaTeX 源码（可选）', exact: true }).click();
  await panel.getByLabel('LaTeX 源码', { exact: true }).fill(String.raw`\frac{ab}{cd}+z`);
  const from = (await panel.locator('[data-math-slot="root/0/numerator"] [data-mml-node="mi"]').first().boundingBox())!;
  const to = (await panel.locator('[data-math-slot="root/0/denominator"] [data-mml-node="mi"]').last().boundingBox())!;
  await page.mouse.move(from.x + 1, from.y + from.height / 2); await page.mouse.down();
  await page.mouse.move(to.x + to.width - 1, to.y + to.height / 2, { steps: 10 }); await page.mouse.up();
  await expect(panel.locator('.qk-math-overlay__selection')).toHaveCount(1);
  const input = panel.getByLabel('可视化公式输入');
  await input.press('Backspace'); await expect(panel.getByLabel('LaTeX 源码', { exact: true })).toHaveValue('+z');
  await input.press('ControlOrMeta+z'); await expect(panel.getByLabel('LaTeX 源码', { exact: true })).toHaveValue(String.raw`\frac{ab}{cd}+z`);
});

test('double click selects a filled argument for direct replacement', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  await insertFormulaTemplate(page, panel, '分数');
  const input = panel.getByLabel('可视化公式输入');
  await input.pressSequentially('abc');
  await panel.locator('[data-math-slot="root/0/numerator"] [data-mml-node="mi"]').nth(1).dblclick();
  await expect(panel.locator('.qk-math-overlay__selection')).toHaveCount(3);
  await input.pressSequentially('x');
  await expectMathText(panel.locator('[data-math-slot="root/0/numerator"]'), 'x');
});


test('symbol chooser preserves formula position and restores the retained input slot', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  await insertFormulaTemplate(page, panel, '分数');
  await panel.getByLabel('可视化公式输入').pressSequentially('abc');
  await panel.locator('[data-math-slot="root/0/numerator"] [data-mml-node="mi"]').nth(1).dblclick();
  const surface = panel.locator('.qk-math-input');
  const before = await surface.boundingBox();
  await panel.getByRole('button', { name: '希腊字母', exact: true }).click();
  expect(await surface.boundingBox()).toEqual(before);
  await expect(surface.locator('.qk-math-overlay__slot')).toHaveAttribute('data-math-active-slot', 'root/0/numerator');
  const paletteBox = (await page.locator('.qk-math-gallery[data-state="open"]').boundingBox())!;
  expect(paletteBox.x).toBeGreaterThanOrEqual(0);
  expect(paletteBox.x + paletteBox.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: '../../.playwright-results/math-ui/symbol-palette.png' });
  await page.getByRole('button', { name: '阿尔法', exact: true }).click();
  await expect(panel.getByLabel('可视化公式输入')).toBeFocused();
  await expectMathText(panel.locator('[data-math-slot="root/0/numerator"]'), 'α');
  expect(await surface.boundingBox()).toEqual(before);
});
