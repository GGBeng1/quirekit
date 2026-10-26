// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from 'vue';
import { expect, it, vi } from 'vitest';
import Actions from './message-actions.vue';
import Action from '../message-action/message-action.vue';
import type { QuireKitChatMessageState } from '../../../components/chat';

it('filters settled/active actions without hiding necessary recovery and carries scoped intents', async () => {
  const state = reactive({ value: 'streaming' as QuireKitChatMessageState, latest: false });
  const act = vi.fn(); const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Actions, { state: state.value, latest: state.latest, visibility: 'auto', messageId: 'm', partId: 'p', copyText: '原文',
    actions: [{ id: 'retry', label: '重新生成' }, { id: 'stop', label: '停止', when: 'active' }], onAction: act }) });
  app.mount(host);
  try {
    expect(host.textContent).toContain('停止'); expect(host.textContent).not.toContain('重新生成');
    expect(host.querySelector('.qk-clipboard')).toBeNull();
    expect(host.querySelector('[data-reveal]')).toBeNull();
    host.querySelector<HTMLButtonElement>('button')!.click();
    expect(act).toHaveBeenCalledWith({ messageId: 'm', partId: 'p', actionId: 'stop' });
    state.value = 'complete'; await nextTick();
    expect(host.textContent).not.toContain('停止'); expect(host.textContent).toContain('重新生成');
    expect(host.querySelector('.qk-clipboard')).not.toBeNull(); expect(host.querySelector('[data-reveal]')).not.toBeNull();
    state.value = 'error'; await nextTick();
    expect(host.querySelector('[data-reveal]')).toBeNull();
    state.value = 'complete'; state.latest = true; await nextTick();
    expect(host.querySelector('[data-reveal]')).toBeNull();
  } finally { app.unmount(); host.remove(); }
});

it('keeps a standalone selected action accessible and blocks busy activation', async () => {
  const state = reactive({ busy: false }); const act = vi.fn(); const host = document.createElement('div');
  const app = createApp({ render: () => h(Action, { action: { id: 'help', label: '有帮助', icon: 'thumbsUp', pressed: true, busy: state.busy }, onAction: act }) });
  app.mount(host);
  try {
    const button = host.querySelector<HTMLButtonElement>('button')!;
    expect(button.getAttribute('aria-label')).toBe('有帮助'); expect(button.getAttribute('aria-pressed')).toBe('true');
    button.click(); expect(act).toHaveBeenCalledOnce();
    state.busy = true; await nextTick(); button.click();
    expect(button.disabled).toBe(true); expect(act).toHaveBeenCalledOnce();
  } finally { app.unmount(); }
});

it.each([{}, { icon: 'thumbsUp' }, { icon: 'thumbsUp', tooltip: false }])('merges consumer classes without losing the public action recipe: %j', options => {
  const host = document.createElement('div');
  const app = createApp({ render: () => h(Action, {
    action: { id: 'help', label: '有帮助', ...('icon' in options ? { icon: options.icon } : {}) },
    ...('tooltip' in options ? { tooltip: options.tooltip } : {}), class: 'consumer-action', 'data-consumer': 'retained'
  }) });
  app.mount(host);
  try {
    const button = host.querySelector<HTMLButtonElement>('button')!;
    expect(button.classList.contains('qk-chat-action')).toBe(true);
    expect(button.classList.contains('consumer-action')).toBe(true);
    expect(button.dataset.consumer).toBe('retained');
  } finally { app.unmount(); }
});
