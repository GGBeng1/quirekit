// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from 'vue';
import { expect, it, vi } from 'vitest';
import PinInput from './pin-input.vue';
import Field from '../field/field.vue';

/** Send the clipboard event a browser would deliver to the focused input.
 * @param input - The receiving visible cell.
 * @param text - Clipboard contents.
 */
function paste(input: HTMLInputElement, text: string): void {
  input.focus();
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
  input.dispatchEvent(event);
}

it('uses Ark paste and deletion with a string model and guards readonly mutations', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const state = reactive({ modelValue: '', readOnly: false });
  const complete = vi.fn(); const invalid = vi.fn();
  const app = createApp({ render: () => h(PinInput, {
    ...state, label: '短码', onValueComplete: complete, onValueInvalid: invalid,
    'onUpdate:modelValue': (value: string) => { state.modelValue = value; }
  }) });
  app.mount(host);
  try {
    const inputs = [...host.querySelectorAll<HTMLInputElement>('[data-part="input"]')];
    paste(inputs[0]!, '123456');
    await vi.waitFor(() => expect(state.modelValue).toBe('1234'));
    await vi.waitFor(() => expect(complete).toHaveBeenCalledExactlyOnceWith('1234'));
    inputs[3]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(state.modelValue).toBe('123'));
    paste(inputs[0]!, 'A');
    expect(invalid).toHaveBeenCalledWith({ value: 'A', index: 0 });
    state.readOnly = true; await nextTick();
    paste(inputs[0]!, '9999');
    inputs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    await nextTick();
    expect(state.modelValue).toBe('123');
    expect(inputs[0]!.readOnly).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
  } finally { app.unmount(); host.remove(); }
});

it('associates Field with the first cell and serializes and resets the native string', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const state = reactive({ value: '12' });
  const app = createApp({ render: () => h('form', {}, [h(Field, { id: 'access-code', label: '访问码', description: '四位数字', required: true }, {
    default: ({ controlProps }: { controlProps: Record<string, unknown> }) => h(PinInput, {
      ...controlProps, modelValue: state.value, defaultValue: '12', name: 'code',
      'onUpdate:modelValue': (value: string) => { state.value = value; }
    })
  })]) });
  app.mount(host);
  try {
    await nextTick();
    const first = host.querySelector<HTMLInputElement>('[data-part="input"]')!;
    const form = host.querySelector('form')!;
    expect(first.id).toBe('access-code');
    expect(host.querySelector('label')?.htmlFor).toBe(first.id);
    expect(first.getAttribute('aria-describedby')).toBeTruthy();
    expect(form.checkValidity()).toBe(false);
    paste(first, '2468');
    await vi.waitFor(() => expect(state.value).toBe('2468'));
    await vi.waitFor(() => expect(new FormData(form).get('code')).toBe('2468'));
    expect(form.checkValidity()).toBe(true);
    form.reset();
    await vi.waitFor(() => expect(state.value).toBe('12'));
    await vi.waitFor(() => expect(new FormData(form).get('code')).toBe('12'));
  } finally { app.unmount(); host.remove(); }
});

it('inherits implicit Field locks and error associations without false defaults', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const state = reactive({ readOnly: true, disabled: false });
  const changed = vi.fn();
  const app = createApp({ render: () => h(Field, { ...state, id: 'locked-code', label: '锁定代码', invalid: true, errorText: '请重新申请代码。' }, {
    default: () => h(PinInput, { defaultValue: '1234', onValueChange: changed })
  }) });
  app.mount(host);
  try {
    await nextTick();
    const first = host.querySelector<HTMLInputElement>('[data-scope="pin-input"][data-part="input"]')!;
    expect(first.id).toBe('locked-code');
    expect(first.readOnly).toBe(true);
    expect(first.getAttribute('aria-invalid')).toBe('true');
    await vi.waitFor(() => expect(document.getElementById(first.getAttribute('aria-errormessage')!)?.textContent).toBe('请重新申请代码。'));
    paste(first, '5678');
    await nextTick();
    expect(changed).not.toHaveBeenCalled();
    state.disabled = true; await nextTick();
    expect(first.disabled).toBe(true);
  } finally { app.unmount(); host.remove(); }
});
