// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from 'vue';
import { expect, it, vi } from 'vitest';
import Submit from './composer-submit.vue';

it.each(['icon', 'text'] as const)('retains the %s button while switching between submit and stop', async (appearance) => {
  const state = reactive({ busy: false, canSubmit: false, disabled: false });
  const submit = vi.fn(); const stop = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Submit, { ...state, appearance, onSubmit: submit, onStop: stop }) });
  app.mount(host);
  try {
    const button = host.querySelector('button')!;
    expect(button.classList.contains('qk-button--primary-solid')).toBe(true);
    expect(button.disabled).toBe(true);
    state.canSubmit = true; await nextTick(); button.click(); expect(submit).toHaveBeenCalledOnce();
    button.focus(); state.busy = true; state.canSubmit = false; await nextTick();
    expect(host.querySelector('button')).toBe(button); expect(document.activeElement).toBe(button);
    expect(button.disabled).toBe(false); button.click(); expect(stop).toHaveBeenCalledOnce();
    state.disabled = true; await nextTick(); button.click(); expect(stop).toHaveBeenCalledOnce();
  } finally { app.unmount(); host.remove(); }
});

it('keeps an explicit neutral color available', () => {
  const host = document.createElement('div');
  const app = createApp({ render: () => h(Submit, { color: 'neutral', canSubmit: true }) });
  app.mount(host);
  try { expect(host.querySelector('.qk-button--neutral-solid')).not.toBeNull(); }
  finally { app.unmount(); }
});
