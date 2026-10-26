// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from 'vue';
import { expect, it, vi } from 'vitest';
import Message from './message.vue';
import type { QuireKitChatMessageActionsSlotContext, QuireKitChatMessageState } from '../../../components/chat';

it('renders ordered parts and defaults without requiring content or action slots', async () => {
  const state = reactive({ state: 'streaming' as QuireKitChatMessageState, text: '第一段', busy: false });
  const action = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Message, {
    author: '助手', messageId: 'm1', state: state.state,
    parts: [{ id: 'body', kind: 'text', text: state.text }, { id: 'plugin', kind: 'custom', name: '图表', fallback: '当前环境暂不能显示图表' }],
    actions: [{ id: 'stop', label: '停止生成', busy: state.busy, when: 'always' }], onAction: action
  }) });
  app.mount(host);
  try {
    expect(host.textContent).toContain('第一段');
    expect(host.querySelector('.qk-shimmer[data-active="true"]')?.textContent).toBe('正在生成');
    expect(host.textContent).toContain('当前环境暂不能显示图表');
    const body = host.querySelector('[data-part-id="body"]');
    host.querySelector<HTMLButtonElement>('button')!.click();
    expect(action).toHaveBeenCalledWith({ messageId: 'm1', actionId: 'stop' });
    state.busy = true; state.text += '，继续回答'; state.state = 'error'; await nextTick();
    expect(host.querySelector('[data-part-id="body"]')).toBe(body);
    expect(host.textContent).toContain('第一段，继续回答');
    expect(host.textContent).toContain('生成失败');
    expect(host.querySelector('.qk-shimmer')).toBeNull();
    expect(host.querySelector<HTMLButtonElement>('button')!.disabled).toBe(true);
  } finally { app.unmount(); host.remove(); }
});

it('keeps branch selection controlled and makes invalid selection explicit', async () => {
  const state = reactive({ selected: 'a' }); const change = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Message, {
    author: '助手', messageId: 'm', branch: { ids: ['a', 'b'], selectedId: state.selected }, onBranchChange: change
  }) });
  app.mount(host);
  try {
    const buttons = host.querySelectorAll<HTMLButtonElement>('button');
    expect(buttons[0]!.disabled).toBe(true); buttons[1]!.click();
    expect(change).toHaveBeenCalledWith({ messageId: 'm', branchId: 'b' });
    expect(host.textContent).toContain('1 / 2');
    state.selected = 'missing'; await nextTick();
    expect(host.textContent).toContain('分支不可用');
    expect([...host.querySelectorAll<HTMLButtonElement>('button')].every(button => button.disabled)).toBe(true);
  } finally { app.unmount(); host.remove(); }
});

it('lets the legacy default slot replace parts instead of duplicating content', () => {
  const host = document.createElement('div');
  const app = createApp({ render: () => h(Message, { author: '助手', parts: [{ id: 'p', kind: 'text', text: '不应再显示' }] }, { default: () => '自己的 renderer' }) });
  app.mount(host);
  try { expect(host.textContent).toContain('自己的 renderer'); expect(host.textContent).not.toContain('不应再显示'); }
  finally { app.unmount(); }
});

it('keeps time and actions in one historical footer', () => {
  const host = document.createElement('div');
  const app = createApp({ render: () => h(Message, {
    author: '助手', messageId: 'old', copyText: '已完成', meta: '09:30', latest: false, actionsVisibility: 'auto'
  }) }); app.mount(host);
  try {
    const footer = host.querySelector('.qk-chat-message__footer[data-reveal]');
    expect(footer).not.toBeNull();
    expect(footer?.textContent).toContain('09:30');
    expect(footer?.querySelector('button[aria-label="复制回复"]')).not.toBeNull();
  } finally { app.unmount(); }
});

it('passes action visibility to a full custom actions slot', async () => {
  const state = reactive({ latest: false, actionsVisibility: 'auto' as 'auto' | 'always' | 'hover' });
  const host = document.createElement('div');
  const app = createApp({ render: () => h(Message, { author: '助手', ...state }, {
    actions: ({ latest, visibility }: QuireKitChatMessageActionsSlotContext) => h('span', `${latest} ${visibility}`)
  }) }); app.mount(host);
  try {
    expect(host.querySelector('.qk-chat-message__actions')?.textContent).toBe('false auto');
    state.latest = true; state.actionsVisibility = 'hover'; await nextTick();
    expect(host.querySelector('.qk-chat-message__actions')?.textContent).toBe('true hover');
  } finally { app.unmount(); }
});
