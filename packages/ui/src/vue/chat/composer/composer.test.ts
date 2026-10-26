// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from 'vue';
import { expect, it, vi } from 'vitest';
import Composer from './composer.vue';

it('emits literal drafts without clearing them, protects IME and exposes stop separately', async () => {
  const state = reactive({ text: '  你好\nworld  ', busy: false, disabled: false, readOnly: false });
  const submit = vi.fn(); const stop = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Composer, {
    modelValue: state.text, busy: state.busy, disabled: state.disabled, readOnly: state.readOnly,
    'onUpdate:modelValue': (value: string) => { state.text = value; }, onSubmit: submit, onStop: stop
  }) });
  app.mount(host);
  /** Dispatch a cancelable native keyboard event to the real public field.
   * @param init - Keyboard modifiers.
   * @returns Dispatched event for default-action assertions.
   */
  function enter(init: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init });
    host.querySelector('textarea')!.dispatchEvent(event); return event;
  }
  try {
    const surface = host.querySelector('.qk-chat-composer__surface')!;
    expect(surface.contains(host.querySelector('textarea'))).toBe(true);
    expect(surface.contains(host.querySelector('button'))).toBe(true);
    expect(host.querySelector('button')!.classList.contains('qk-button--primary-solid')).toBe(true);
    expect(host.querySelector('.qk-textarea--embedded')).not.toBeNull();
    expect(enter({ isComposing: true }).defaultPrevented).toBe(false);
    expect(enter({ keyCode: 229 }).defaultPrevented).toBe(false);
    expect(enter({ shiftKey: true }).defaultPrevented).toBe(false);
    enter({ repeat: true }); expect(submit).not.toHaveBeenCalled();
    expect(enter().defaultPrevented).toBe(true);
    expect(submit).toHaveBeenCalledExactlyOnceWith({ text: '  你好\nworld  ' });
    expect(host.querySelector('textarea')!.value).toBe(state.text);
    state.busy = true; await nextTick(); enter(); expect(submit).toHaveBeenCalledTimes(1);
    expect(host.querySelector('textarea')!.disabled).toBe(false);
    host.querySelector<HTMLButtonElement>('button')!.click(); expect(stop).toHaveBeenCalledOnce();
    state.busy = false; state.readOnly = true; await nextTick(); enter();
    expect(submit).toHaveBeenCalledTimes(1);
    state.readOnly = false; state.text = ' \n '; await nextTick(); enter();
    expect(submit).toHaveBeenCalledTimes(1);
    state.disabled = true; state.busy = true; await nextTick();
    expect(host.querySelector('.qk-chat-composer')!.hasAttribute('data-disabled')).toBe(true);
    host.querySelector<HTMLButtonElement>('button')!.click(); expect(stop).toHaveBeenCalledOnce();
  } finally { app.unmount(); host.remove(); }
});

it('leaves newline mode native and preserves drafts across a rejected submission', async () => {
  const text = reactive({ value: '待发送' }); const submit = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Composer, {
    modelValue: text.value, submitMode: 'button', onSubmit: submit,
    'onUpdate:modelValue': (value: string) => { text.value = value; }
  }, { footer: () => h('span', '发送失败，可重试') }) });
  app.mount(host);
  try {
    const field = host.querySelector('textarea')!;
    expect(host.querySelector('.qk-chat-composer__surface')!.contains(host.querySelector('.qk-chat-composer__footer'))).toBe(false);
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    field.dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    field.value = '新草稿'; field.dispatchEvent(new Event('input', { bubbles: true })); await nextTick();
    expect(text.value).toBe('新草稿');
    host.querySelector<HTMLButtonElement>('button')!.click(); await nextTick();
    expect(submit).toHaveBeenCalledWith({ text: '新草稿' });
    expect(field.value).toBe('新草稿');
  } finally { app.unmount(); host.remove(); }
});

it('keeps the input and submit target stable across layouts, busy state and external-content gates', async () => {
  const state = reactive({ layout: 'panel' as 'panel' | 'inline', busy: false, hasContent: false, submitDisabled: false });
  const submit = vi.fn(); const stop = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Composer, { modelValue: '', ...state, onSubmit: submit, onStop: stop }, {
    tools: () => h('span', '权限'), actions: () => h('span', '模型'), footer: () => h('span', '附件待就绪')
  }) });
  app.mount(host);
  try {
    const field = host.querySelector('textarea')!; const button = host.querySelector('button')!;
    expect(button.disabled).toBe(true);
    expect(host.querySelector('.qk-chat-composer__actions')?.textContent).toBe('模型');
    expect(field.getAttribute('aria-describedby')).toBe(host.querySelector('.qk-chat-composer__footer')?.id);
    state.hasContent = true; await nextTick(); button.click();
    expect(submit).toHaveBeenCalledExactlyOnceWith({ text: '' });
    state.submitDisabled = true; await nextTick(); button.click();
    expect(button.disabled).toBe(true); expect(field.disabled).toBe(false);
    expect(submit).toHaveBeenCalledTimes(1);
    field.focus(); field.setSelectionRange(0, 0);
    state.layout = 'inline'; await nextTick();
    expect(host.querySelector('textarea')).toBe(field); expect(document.activeElement).toBe(field);
    expect(field.getAttribute('rows')).toBe('1');
    state.busy = true; await nextTick();
    expect(host.querySelector('button')).toBe(button); expect(button.disabled).toBe(false);
    button.click(); expect(stop).toHaveBeenCalledOnce();
  } finally { app.unmount(); host.remove(); }
});

it('delegates file paste and drop without intercepting text, replacing the draft or accepting locked input', async () => {
  const state = reactive({ text: '保留草稿', disabled: false, readOnly: false });
  const accepted: string[] = [];
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Composer, {
    modelValue: state.text, disabled: state.disabled, readOnly: state.readOnly,
    addTransferFiles: (transfer: DataTransfer) => {
      accepted.push(...Array.from(transfer.files, file => file.name));
      return transfer.files.length > 0;
    }
  }) });
  app.mount(host);
  try {
    const surface = host.querySelector<HTMLElement>('.qk-chat-composer')!;
    const field = host.querySelector<HTMLTextAreaElement>('textarea')!;
    const text = new DataTransfer(); text.setData('text/plain', '普通文字');
    const textPaste = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: text });
    field.dispatchEvent(textPaste);
    expect(textPaste.defaultPrevented).toBe(false);
    const files = new DataTransfer(); files.items.add(new File(['image'], '截图.png', { type: 'image/png' }));
    const filePaste = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: files });
    field.dispatchEvent(filePaste);
    expect(filePaste.defaultPrevented).toBe(true);
    expect(accepted).toEqual(['截图.png']);
    expect(field.value).toBe('保留草稿');
    const drag = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: files });
    Object.defineProperty(drag, 'dataTransfer', { value: files });
    field.dispatchEvent(drag); await nextTick();
    expect(drag.defaultPrevented).toBe(true);
    expect(surface.hasAttribute('data-file-dragging')).toBe(true);
    const drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: files });
    Object.defineProperty(drop, 'dataTransfer', { value: files });
    field.dispatchEvent(drop); await nextTick();
    expect(drop.defaultPrevented).toBe(true);
    expect(surface.hasAttribute('data-file-dragging')).toBe(false);
    expect(accepted).toEqual(['截图.png', '截图.png']);
    state.readOnly = true; await nextTick();
    const locked = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: files });
    field.dispatchEvent(locked);
    expect(locked.defaultPrevented).toBe(false);
    expect(accepted).toHaveLength(2);
    state.readOnly = false; state.disabled = true; await nextTick();
    field.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: files }));
    expect(accepted).toHaveLength(2);
  } finally { app.unmount(); host.remove(); }
});

it('focuses the input when the surface around it is pressed, leaving its controls alone', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Composer, { modelValue: '', rows: 1 }, { tools: () => h('button', { class: 'tool' }, 'mode') }) });
  app.mount(host);
  try {
    const field = host.querySelector('textarea')!;
    const press = (target: Element) => {
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 });
      target.dispatchEvent(event); return event;
    };
    const bar = host.querySelector('.qk-chat-composer__bar')!;
    expect(press(bar).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(field);
    field.blur();
    expect(press(host.querySelector('.tool')!).defaultPrevented).toBe(false);
    expect(document.activeElement).not.toBe(field);
    expect(press(field).defaultPrevented).toBe(false);
  } finally { app.unmount(); host.remove(); }
});
