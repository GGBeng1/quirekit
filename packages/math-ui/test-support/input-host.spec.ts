import { expect, test } from '@playwright/test';

test('non-form capture preserves native composition, consumes fallback text and restores its owner', async ({ page }) => {
  await page.goto('/headless.html');
  const result = await page.evaluate(async () => {
    const { getStandaloneInstance, bindMathEditor } = await import('/headless/main.ts');
    const { editor, view, host } = getStandaloneInstance('a');
    view!.destroy();
    const input = document.createElement('div');
    input.contentEditable = 'plaintext-only'; input.setAttribute('aria-disabled', 'false');
    const original = document.createTextNode('consumer-owned'); input.append(original); host.append(input);
    const binding = bindMathEditor({ editor, surface: host.querySelector<HTMLElement>('.surface')!, input, graphic: () => null });
    const mounted = input.textContent;
    binding.focus();
    // Native input fallback must read the editable DOM when beforeinput is absent.
    input.textContent = 'a';
    input.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: null, bubbles: true }));
    const ordinary = { draft: editor.getSnapshot().draft, buffer: input.textContent };
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    const pending = document.createTextNode('中文'); input.append(pending);
    const observer = new MutationObserver(() => {}); observer.observe(input, { attributes: true, childList: true, subtree: true });
    const layouts = editor.getSnapshot().presentation.layouts;
    input.dispatchEvent(new InputEvent('input', { inputType: 'insertCompositionText', data: null, isComposing: true, bubbles: true }));
    const composing = { draft: editor.getSnapshot().draft, preedit: editor.getSnapshot().preedit,
      retained: input.firstChild === pending, mutations: observer.takeRecords().length,
      layouts: editor.getSnapshot().presentation.layouts - layouts };
    observer.disconnect();
    input.dispatchEvent(new CompositionEvent('compositionend', { data: '', bubbles: true }));
    input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertFromComposition', data: '中文', bubbles: true, cancelable: true }));
    const committed = { draft: editor.getSnapshot().draft, buffer: input.textContent };
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); input.textContent = '未提交';
    input.dispatchEvent(new CompositionEvent('compositionupdate', { data: '未提交', bubbles: true }));
    input.blur();
    const cancelled = { draft: editor.getSnapshot().draft, buffer: input.textContent, composing: editor.getSnapshot().composing };
    editor.setDisabled(true);
    const disabled = { editable: input.contentEditable, aria: input.getAttribute('aria-disabled') };
    input.textContent = 'late'; input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const rejected = { draft: editor.getSnapshot().draft, buffer: input.textContent };
    editor.setDisabled(false); binding.focus();
    const enabled = { editable: input.contentEditable, focused: document.activeElement === input };
    binding.destroy(); binding.destroy();
    const restored = { node: input.firstChild === original, text: input.textContent,
      editable: input.contentEditable, aria: input.getAttribute('aria-disabled') };
    input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'z', bubbles: true, cancelable: true }));
    return { mounted, ordinary, composing, committed, cancelled, disabled, rejected, enabled, restored, released: editor.getSnapshot().draft };
  });
  const draft = String.raw`a\text{中文}`;
  expect(result).toEqual({ mounted: '', ordinary: { draft: 'a', buffer: '' },
    composing: { draft: 'a', preedit: '中文', retained: true, mutations: 0, layouts: 0 },
    committed: { draft, buffer: '' }, cancelled: { draft, buffer: '', composing: false },
    disabled: { editable: 'false', aria: 'true' }, rejected: { draft, buffer: '' },
    enabled: { editable: 'plaintext-only', focused: true },
    restored: { node: true, text: 'consumer-owned', editable: 'plaintext-only', aria: 'false' }, released: draft });
});

test('visual capture uses non-form semantics and keeps native typing, deletion and history', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  const input = panel.getByRole('textbox', { name: '可视化公式输入', exact: true });
  await expect(input).toHaveAttribute('contenteditable', 'plaintext-only');
  expect(await input.evaluate(element => element.matches('input, textarea, select'))).toBe(false);
  await panel.locator('[data-math-placeholder]').click();
  await input.pressSequentially('abc'); await input.press('Backspace'); await input.press('ControlOrMeta+z');
  await expect(input).toBeFocused(); await expect(input).toHaveText('');
  await panel.getByRole('button', { name: 'LaTeX 源码（可选）', exact: true }).click();
  await expect(panel.getByRole('textbox', { name: 'LaTeX 源码', exact: true })).toHaveValue('abc');
});
