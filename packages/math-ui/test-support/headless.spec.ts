import { expect, test } from '@playwright/test';

test('plain DOM consumer loads no Vue/UI and edits nested formulas, discovery and history', async ({ page }) => {
  const modules: string[] = []; page.on('request', request => modules.push(request.url()));
  await page.goto('/headless.html');
  const first = page.getByRole('region', { name: '第一组公式' }); const input = first.getByLabel('可视化公式输入');
  await expect(first.locator('.surface')).toHaveAttribute('data-ready', 'true');
  await first.getByRole('button', { name: '分数', exact: true }).click();
  await input.pressSequentially('ab'); await input.press('Tab'); await input.press('Backslash');
  await first.getByLabel('搜索公式').fill('square root');
  await first.getByLabel('搜索公式').press('Enter'); await input.pressSequentially('c');
  await expect(first.getByLabel('当前公式')).toHaveText(String.raw`\frac{ab}{\sqrt{c}}`);
  await expect(page.getByRole('region', { name: '第二组公式' }).getByLabel('当前公式')).toHaveText('z');
  await input.press('ControlOrMeta+z'); await expect(first.getByLabel('当前公式')).toHaveText(String.raw`\frac{ab}{\sqrt{}}`);
  await input.press('ControlOrMeta+y'); await expect(first.getByLabel('当前公式')).toHaveText(String.raw`\frac{ab}{\sqrt{c}}`);
  await first.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByLabel('已保存公式')).toHaveText(String.raw`\frac{ab}{\sqrt{c}}`);
  expect(modules.filter(url => /(?:vue|@ark-ui|packages\/ui\/|@quirekit_ui|math-ui\/src)/u.test(url))).toEqual([]);
});

test('independent IME keeps preedit out of source and deduplicates a same-task trailing key', async ({ page }) => {
  await page.goto('/headless.html');
  const first = page.getByRole('region', { name: '第一组公式' }); const input = first.getByLabel('可视化公式输入');
  await expect(first.locator('.surface')).toHaveAttribute('data-ready', 'true'); await input.focus();
  await input.evaluate(element => {
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    element.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'β', bubbles: true }));
  });
  await expect(first.locator('.preedit')).toHaveText('β'); await expect(first.getByLabel('当前公式')).toHaveText('');
  const result = await input.evaluate(async element => {
    const { getStandaloneInstance } = await import('/headless/main.ts');
    element.dispatchEvent(new CompositionEvent('compositionend', { data: 'β', bubbles: true }));
    const committed = getStandaloneInstance('a').editor.getSnapshot().draft;
    // A slow consumer listener must not turn a same-task browser residue into deliberate deletion.
    const start = performance.now(); while (performance.now() - start < 4) { /* bounded consumer work */ }
    element.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertFromComposition', data: 'β', bubbles: true, cancelable: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    return { committed, final: getStandaloneInstance('a').editor.getSnapshot().draft };
  });
  expect(result).toEqual({ committed: 'β', final: 'β' });
  await expect(first.locator('.preedit')).toHaveCount(0);
  await input.press('Backspace'); await expect(first.getByLabel('当前公式')).toHaveText('');
});

test('a delayed consumer DOM commit cannot activate old graphic geometry for the new model', async ({ page }) => {
  await page.goto('/headless.html');
  const first = page.getByRole('region', { name: '第一组公式' }); const surface = first.locator('.surface');
  await first.getByLabel('LaTeX 源码').fill('abc'); await expect(surface).toHaveAttribute('data-ready', 'true');
  await page.evaluate(async () => { const { getStandaloneInstance } = await import('/headless/main.ts'); getStandaloneInstance('a').view!.pauseGraphic(true); });
  const old = await first.locator('svg').evaluate(element => element.outerHTML);
  await first.getByLabel('LaTeX 源码').fill(String.raw`\frac{x}{y}`); await expect(surface).toHaveAttribute('data-ready', 'true');
  const proof = await page.evaluate(async () => {
    const { getStandaloneInstance } = await import('/headless/main.ts'); const instance = getStandaloneInstance('a');
    instance.view!.binding.refresh(); return instance.view!.binding.getSnapshot().geometry.length;
  });
  expect(proof).toBe(0); expect(await first.locator('svg').evaluate(element => element.outerHTML)).toBe(old);
  await page.evaluate(async () => { const { getStandaloneInstance } = await import('/headless/main.ts'); getStandaloneInstance('a').view!.pauseGraphic(false); });
  await expect(first.locator('[data-math-slot="root/0/numerator"]')).toBeVisible();
  expect(await page.evaluate(async () => (await import('/headless/main.ts')).getStandaloneInstance('a').view!.binding.getSnapshot().geometry.length)).toBeGreaterThan(0);
});

test('native drag tracks frames, flushes final point and keeps the graphic and layout count stable', async ({ page }) => {
  await page.goto('/headless.html');
  const first = page.getByRole('region', { name: '第一组公式' });
  await first.getByLabel('LaTeX 源码').fill('abcde'); await expect(first.locator('.surface')).toHaveAttribute('data-ready', 'true');
  const nodes = first.locator('.graphic [data-mml-node="mi"]');
  const from = (await nodes.first().boundingBox())!; const middle = (await nodes.nth(2).boundingBox())!; const to = (await nodes.last().boundingBox())!;
  const layouts = await first.locator('.surface').getAttribute('data-layouts');
  await first.locator('svg').evaluate(element => element.setAttribute('data-retained', 'yes'));
  await page.mouse.move(from.x + 1, from.y + from.height / 2); await page.mouse.down();
  await page.mouse.move(middle.x + middle.width - 1, middle.y + middle.height / 2, { steps: 6 });
  await expect(first.locator('.selection')).toHaveCount(3);
  await page.mouse.move(to.x + to.width - 1, to.y + to.height / 2, { steps: 6 }); await page.mouse.up();
  await expect(first.locator('.selection')).toHaveCount(5); await expect(first.locator('svg')).toHaveAttribute('data-retained', 'yes');
  await expect(first.locator('.surface')).toHaveAttribute('data-layouts', layouts!);
  await first.getByLabel('可视化公式输入').pressSequentially('x'); await expect(first.getByLabel('当前公式')).toHaveText('x');
  await page.screenshot({ path: '../../.playwright-results/math-ui/headless-consumer.png' });
});

test('unbinding is idempotent and does not destroy a borrowed editor or its source/selection history', async ({ page }) => {
  await page.goto('/headless.html');
  const first = page.getByRole('region', { name: '第一组公式' });
  await first.getByRole('button', { name: '分数', exact: true }).click();
  await first.getByLabel('可视化公式输入').pressSequentially('a');
  const before = await first.getByLabel('当前公式').textContent();
  const result = await page.evaluate(async () => {
    const { getStandaloneInstance } = await import('/headless/main.ts'); const instance = getStandaloneInstance('a');
    instance.view!.destroy(); instance.view!.destroy();
    const capture = instance.host.querySelector('textarea')!;
    capture.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'z', bubbles: true, cancelable: true }));
    const source = instance.editor.getSnapshot().draft; instance.editor.insertText('b');
    return { source, next: instance.editor.getSnapshot().draft, disposed: instance.editor.getSnapshot().disposed };
  });
  expect(result).toEqual({ source: before, next: String.raw`\frac{ab}{}`, disposed: false });
  await expect(first.getByLabel('当前公式')).toHaveText(before!);
  await page.evaluate(async () => { (await import('/headless/main.ts')).remountStandaloneView('a'); });
  await expect(first.getByLabel('当前公式')).toHaveText(String.raw`\frac{ab}{}`);
  await first.getByRole('button', { name: '撤销' }).click(); await expect(first.getByLabel('当前公式')).toHaveText(before!);
});

test('renderer-neutral native binding works with a plain SVG backend and zero selection measurements', async ({ page }) => {
  await page.goto('/headless.html');
  await page.evaluate(async () => {
    const { mountPlainSvgConsumer } = await import('/headless/renderer.ts');
    const host = document.createElement('div'); host.id = 'plain-backend'; document.querySelector('main')!.append(host);
    const { editor, view } = mountPlainSvgConsumer(host);
    host.addEventListener('test-selection', () => {
      const before = view.binding.getSnapshot().measurements;
      editor.move('home'); editor.move('right', true);
      host.dataset.measurementDelta = String(view.binding.getSnapshot().measurements - before);
    });
    host.addEventListener('test-unmount', () => { view.destroy(); editor.destroy(); });
  });
  const host = page.locator('#plain-backend'); await expect(host.locator('.surface')).toHaveAttribute('data-ready', 'true');
  await expect(host.locator('svg[data-math-renderer]')).toHaveCount(0);
  await host.locator('svg').click({ position: { x: 64, y: 16 } });
  await expect(host.locator('.caret')).toBeVisible();
  const svg = await host.locator('svg').evaluate(element => element.outerHTML);
  await host.dispatchEvent('test-selection'); await expect(host.locator('.selection')).toHaveCount(1);
  await expect(host).toHaveAttribute('data-measurement-delta', '0');
  expect(await host.locator('svg').evaluate(element => element.outerHTML)).toBe(svg);
  await host.dispatchEvent('test-unmount');
});

test('a burst of native pointer events accepts one tracking update per frame and flushes pointerup', async ({ page }) => {
  await page.goto('/headless.html');
  const first = page.getByRole('region', { name: '第一组公式' });
  await first.getByLabel('LaTeX 源码').fill('abcde'); await expect(first.locator('.surface')).toHaveAttribute('data-ready', 'true');
  const from = (await first.locator('.graphic [data-mml-node="mi"]').first().boundingBox())!;
  await first.locator('.surface').evaluate(element => element.addEventListener('pointerdown', event => {
    element.setAttribute('data-captured-id', String((event as PointerEvent).pointerId));
  }));
  await page.mouse.move(from.x + 1, from.y + from.height / 2); await page.mouse.down();
  const results = await page.evaluate(async () => {
    const { getStandaloneInstance } = await import('/headless/main.ts'); const instance = getStandaloneInstance('a');
    const binding = instance.view!.binding; const surface = instance.host.querySelector<HTMLElement>('.surface')!;
    const middle = instance.host.querySelectorAll('.graphic [data-mml-node="mi"]')[2]!.getBoundingClientRect();
    const last = instance.host.querySelectorAll('.graphic [data-mml-node="mi"]')[4]!.getBoundingClientRect();
    const id = Number(surface.dataset.capturedId); const before = binding.getSnapshot().pointerUpdates;
    for (let i = 0; i < 100; i++) surface.dispatchEvent(new PointerEvent('pointermove', { pointerId: id, clientX: middle.right - 1, clientY: middle.top + middle.height / 2, bubbles: true }));
    const synchronous = binding.getSnapshot().pointerUpdates - before;
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const frame = binding.getSnapshot().pointerUpdates - before;
    surface.dispatchEvent(new PointerEvent('pointerup', { pointerId: id, clientX: last.right - 1, clientY: last.top + last.height / 2, bubbles: true }));
    return { synchronous, frame, final: binding.getSnapshot().pointerUpdates - before, selection: instance.editor.getSnapshot().selection };
  });
  expect(results.synchronous).toBe(0); expect(results.frame).toBe(1); expect(results.final).toBe(2);
  expect(results.selection).toEqual({ anchor: { slot: 'root', index: 0 }, focus: { slot: 'root', index: 5 } });
  await page.mouse.up();
});

test('compatibility mouse defaults respect input ownership and add no selection or layout work', async ({ page }) => {
  await page.goto('/headless.html');
  const first = page.getByRole('region', { name: '第一组公式' });
  await expect(first.locator('.surface')).toHaveAttribute('data-ready', 'true');
  const result = await page.evaluate(async () => {
    const { getStandaloneInstance } = await import('/headless/main.ts');
    const { editor, view, host } = getStandaloneInstance('a');
    const surface = host.querySelector<HTMLElement>('.surface')!;
    /** @param button - Native mouse button. @returns Whether the browser default was cancelled. */
    function cancelled(button = 0): boolean {
      return !surface.dispatchEvent(new MouseEvent('mousedown', { button, bubbles: true, cancelable: true }));
    }
    const before = { core: editor.getSnapshot(), browser: view!.binding.getSnapshot() };
    const active = Array.from({ length: 100 }, () => cancelled()).every(Boolean);
    const unchanged = editor.getSnapshot() === before.core && view!.binding.getSnapshot() === before.browser;
    const secondary = cancelled(2);
    editor.setCommandOpen(true); const menu = cancelled(); editor.setCommandOpen(false);
    editor.setComposition(true, '中'); const composing = cancelled(); editor.setComposition(false, '');
    editor.setDisabled(true); const disabled = cancelled(); editor.setDisabled(false);
    view!.binding.setRenderedLayout(undefined); const stale = cancelled();
    view!.destroy(); const released = cancelled();
    return { active, unchanged, secondary, menu, composing, disabled, stale, released };
  });
  expect(result).toEqual({ active: true, unchanged: true, secondary: false, menu: false, composing: false, disabled: false, stale: false, released: false });
});
