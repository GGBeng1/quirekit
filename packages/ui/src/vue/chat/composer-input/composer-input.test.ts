// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, ref } from 'vue';
import { expect, it, vi } from 'vitest';
import Input from './composer-input.vue';
import type { QuireKitChatComposerInputInstance } from '../../../components/chat';

it('works outside Composer with a public focus contract and a raw submit gesture', async () => {
  const state = reactive({ value: '  未裁剪  ', readOnly: false });
  const input = ref<QuireKitChatComposerInputInstance>(); const submit = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Input, { ref: input, modelValue: state.value, readOnly: state.readOnly, onSubmit: submit }) });
  app.mount(host);
  try {
    const field = host.querySelector('textarea')!;
    expect(host.querySelector('.qk-textarea--embedded')).toBeNull();
    field.setSelectionRange(2, 5); input.value!.focus({ preventScroll: true });
    expect(document.activeElement).toBe(field); expect(field.selectionStart).toBe(2); expect(field.selectionEnd).toBe(5);
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(submit).toHaveBeenCalledExactlyOnceWith({ text: state.value });
    state.readOnly = true; await nextTick();
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(submit).toHaveBeenCalledTimes(1);
  } finally { app.unmount(); host.remove(); }
});
