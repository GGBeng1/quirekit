import { expect, test } from '@playwright/test';
import { expectMathText } from './layout';
import { insertFormulaTemplate } from './palette';

test('outer deletion boundaries preserve the draft without an unsupported-operation message', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await panel.locator('[data-math-placeholder]').click();
  await input.press('Backspace');
  await expect(panel.getByRole('status')).toHaveText('');
  await input.pressSequentially('ab');
  await input.press('Home'); await input.press('Backspace');
  await input.press('End'); await input.press('Delete');
  await expectMathText(panel.locator('[data-mml-node="math"]'), 'ab');
  await expect(panel.getByRole('status')).toHaveText('');
  await input.press('ControlOrMeta+z');
  await expectMathText(panel.locator('[data-mml-node="math"]'), 'a');
});

test('selecting a structure for deletion changes only the overlay', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await insertFormulaTemplate(page, panel, '分数');
  await input.press('Home'); await input.press('ArrowLeft'); await input.press('End');
  const surface = panel.locator('.qk-math-input');
  await expect(surface).toHaveAttribute('data-ready', 'true');
  await surface.evaluate(element => {
    const observer = new MutationObserver(records => {
      element.setAttribute('data-readiness-updates', String(Number(element.getAttribute('data-readiness-updates')) + records.length));
    });
    element.setAttribute('data-readiness-updates', '0');
    observer.observe(element, { attributes: true, attributeFilter: ['data-ready'] });
  });
  await input.press('Backspace');
  await expect(panel.locator('[data-math-selected]')).toHaveCount(1);
  await expect(surface).toHaveAttribute('data-readiness-updates', '0');
  await input.press('Backspace');
  await expect(panel.locator('[data-mml-node="mfrac"]')).toHaveCount(0);
  await input.press('ControlOrMeta+z');
  await expect(panel.locator('[data-mml-node="mfrac"]')).toHaveCount(1);
});

test('non-text and rejected clipboard contents cannot erase a structural selection', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await insertFormulaTemplate(page, panel, '分数');
  await input.pressSequentially('ab');
  await input.press('Home'); await input.press('Shift+ArrowRight');
  await input.evaluate(element => {
    const data = new DataTransfer(); data.setData('text/html', '<img src="image.png">');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expectMathText(panel.locator('[data-math-slot="root/0/numerator"]'), 'ab');
  await expect(panel.locator('[data-math-selected]')).toHaveCount(1);
  await input.evaluate(element => {
    const data = new DataTransfer(); data.setData('text/plain', '\\unsupported');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expectMathText(panel.locator('[data-math-slot="root/0/numerator"]'), 'ab');
  await expect(panel.locator('[data-math-selected]')).toHaveCount(1);
  await input.pressSequentially('c');
  await expectMathText(panel.locator('[data-math-slot="root/0/numerator"]'), 'cb');
});

test('native deletion and history beforeinput use the same structural operations as keyboard commands', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await panel.locator('[data-math-placeholder]').click();
  await input.pressSequentially('abc');
  await input.evaluate(element => element.dispatchEvent(new InputEvent('beforeinput', { inputType: 'deleteContentBackward', bubbles: true, cancelable: true })));
  await expectMathText(panel.locator('[data-mml-node="math"]'), 'ab');
  await input.evaluate(element => element.dispatchEvent(new InputEvent('beforeinput', { inputType: 'historyUndo', bubbles: true, cancelable: true })));
  await expectMathText(panel.locator('[data-mml-node="math"]'), 'abc');
  await input.evaluate(element => element.dispatchEvent(new InputEvent('beforeinput', { inputType: 'historyRedo', bubbles: true, cancelable: true })));
  await expectMathText(panel.locator('[data-mml-node="math"]'), 'ab');
  await input.press('Home');
  await input.evaluate(element => element.dispatchEvent(new InputEvent('beforeinput', { inputType: 'deleteContentForward', bubbles: true, cancelable: true })));
  await expectMathText(panel.locator('[data-mml-node="math"]'), 'b');
  await input.press('ControlOrMeta+z');
  await expectMathText(panel.locator('[data-mml-node="math"]'), 'ab');
  await input.press('ControlOrMeta+y');
  await expectMathText(panel.locator('[data-mml-node="math"]'), 'b');
});

test('long formulas keep the caret visible through typing and keyboard navigation without relayout', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByLabel('可视化公式输入');
  await panel.locator('[data-math-placeholder]').click();
  const formula = 'a+b+c+d+e+f+g+h+i+j+k+l+m+n+o+p+q+r+s+t+u+v+w+x+y+z';
  await input.pressSequentially(formula);
  const surface = panel.locator('.qk-math-input');
  await expect(surface).toHaveAttribute('data-ready', 'true');
  const visibleCaret = () => surface.evaluate(element => {
    const viewport = element.getBoundingClientRect();
    const caret = element.querySelector('.qk-math-input__caret')?.getBoundingClientRect();
    return !!caret && caret.left >= viewport.left + element.clientLeft && caret.right <= viewport.left + element.clientLeft + element.clientWidth;
  });
  await expect.poll(visibleCaret).toBe(true);
  expect(await surface.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  const layouts = await surface.getAttribute('data-layouts');
  await input.press('Home');
  await expect.poll(visibleCaret).toBe(true);
  expect(await surface.evaluate(element => element.scrollLeft)).toBeLessThan(40);
  await input.press('End');
  await expect.poll(visibleCaret).toBe(true);
  await input.press('Shift+ArrowLeft'); await input.press('ArrowLeft');
  await expect.poll(visibleCaret).toBe(true);
  await expect(surface).toHaveAttribute('data-layouts', layouts!);
  await expectMathText(panel.locator('[data-mml-node="math"]'), formula);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await panel.screenshot({ path: '../../.playwright-results/math-ui/audit-long-formula.png' });
});
