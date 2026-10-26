// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from 'vue';
import { expect, it, vi } from 'vitest';
import MessageList from './message-list.vue';
import type { QuireKitChatMessageListItem } from '../../../components/chat';

it('renders data by default, retains message/part identity and isolates reused ids between conversations', async () => {
  const state = reactive({ conversationId: 'one', messages: [
    { messageId: 'a', author: '你', align: 'end', variant: 'soft', parts: [{ id: 'body', kind: 'text', text: '问题' }] },
    { messageId: 'b', author: '助手', state: 'pending' }
  ] as QuireKitChatMessageListItem[] });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(MessageList, state) }); app.mount(host);
  try {
    expect([...host.querySelectorAll('article')].map(node => node.getAttribute('aria-label'))).toEqual(['你', '助手']);
    expect(host.querySelector('[data-message-id="a"]')?.getAttribute('data-align')).toBe('end');
    expect(host.querySelector('.qk-shimmer')?.textContent).toBe('正在等待回复');
    const article = host.querySelector('[data-message-id="a"]'); const body = host.querySelector('[data-part-id="body"]');
    state.messages[0] = { ...state.messages[0]!, parts: [{ id: 'body', kind: 'text', text: '更新问题' }] };
    state.messages.push({ messageId: 'c', author: '工具', parts: [{ id: 'unknown', kind: 'custom', name: '预览', fallback: '暂不支持' }] });
    await nextTick();
    expect(host.textContent).toContain('更新问题'); expect(host.textContent).toContain('暂不支持');
    expect(host.querySelector('[data-message-id="a"]')).toBe(article);
    expect(host.querySelector('[data-part-id="body"]')).toBe(body);
    state.messages.reverse(); await nextTick();
    expect(host.querySelector('[data-message-id="a"]')).toBe(article);
    state.conversationId = 'two'; await nextTick();
    expect(host.querySelector('[data-message-id="a"]')).not.toBe(article);
    state.messages = []; await nextTick(); expect(host.textContent).toContain('暂无消息');
    expect(host.querySelector('[role="list"]')).toBeNull();
  } finally { app.unmount(); host.remove(); }
});

it('supports partial renderers, forwards scoped actions and leaves branches host-controlled', async () => {
  const action = vi.fn(); const branchChange = vi.fn();
  const messages: QuireKitChatMessageListItem[] = [{ messageId: 'm', author: '助手',
    parts: [{ id: 'text', kind: 'text', text: '原文' }, { id: 'plugin', kind: 'custom', name: '预览', fallback: '默认回退', actions: [{ id: 'open', label: '打开' }] }],
    branch: { ids: ['one', 'two'], selectedId: 'one' }, actions: [{ id: 'retry', label: '重试' }] }];
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(MessageList, { messages, onAction: action, onBranchChange: branchChange }, {
    text: ({ part }: { part: { text: string } }) => h('strong', part.text)
  }) }); app.mount(host);
  try {
    expect(host.querySelector('strong')?.textContent).toBe('原文'); expect(host.textContent).toContain('默认回退');
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('button')];
    buttons.find(button => button.textContent === '打开')!.click();
    expect(action).toHaveBeenLastCalledWith({ messageId: 'm', partId: 'plugin', actionId: 'open' });
    buttons.find(button => button.textContent === '重试')!.click();
    expect(action).toHaveBeenLastCalledWith({ messageId: 'm', actionId: 'retry' });
    buttons.find(button => button.getAttribute('aria-label') === '下一个版本')!.click(); await nextTick();
    expect(branchChange).toHaveBeenCalledWith({ messageId: 'm', branchId: 'two' });
    expect(host.textContent).toContain('1 / 2');
  } finally { app.unmount(); host.remove(); }
});

it('lets a full renderer replace the default Message and supplies resolved action policy', () => {
  const host = document.createElement('div');
  const app = createApp({ render: () => h(MessageList, { actionsVisibility: 'hover', messages: [{ messageId: 'm', author: '助手' }] }, {
    message: ({ message, index, latest, actionsVisibility }: { message: QuireKitChatMessageListItem; index: number; latest: boolean; actionsVisibility: string }) =>
      h('p', `${index}: ${message.messageId} ${latest} ${actionsVisibility}`)
  }) }); app.mount(host);
  try { expect(host.textContent).toContain('0: m true hover'); expect(host.querySelector('article')).toBeNull(); }
  finally { app.unmount(); }
});

it('uses the actual last message for the shared footer policy and supports list and item overrides', async () => {
  const messages = reactive<QuireKitChatMessageListItem[]>([
    { messageId: 'a', author: '助手', copyText: '第一条' },
    { messageId: 'b', author: '助手', copyText: '第二条', meta: '09:32' },
    { messageId: 'c', author: '你', align: 'end', copyText: '用户消息', meta: '09:33' }
  ]);
  const policy = reactive({ actionsVisibility: 'auto' as 'auto' | 'always' | 'hover' });
  const host = document.createElement('div');
  const app = createApp({ render: () => h(MessageList, { messages, ...policy }) }); app.mount(host);
  try {
    expect(host.querySelector('[data-message-id="a"] .qk-chat-message__footer[data-reveal]')).not.toBeNull();
    expect(host.querySelector('[data-message-id="b"] .qk-chat-message__footer[data-reveal]')).not.toBeNull();
    expect(host.querySelector('[data-message-id="b"] .qk-chat-message__footer')?.textContent).toContain('09:32');
    expect(host.querySelector('[data-message-id="c"] .qk-chat-message__footer[data-reveal]')).toBeNull();
    policy.actionsVisibility = 'always'; await nextTick();
    expect(host.querySelectorAll('.qk-chat-message__footer[data-reveal]')).toHaveLength(0);
    policy.actionsVisibility = 'hover'; await nextTick();
    expect(host.querySelectorAll('.qk-chat-message__footer[data-reveal]')).toHaveLength(3);
    policy.actionsVisibility = 'auto'; await nextTick();
    messages.push({ messageId: 'd', author: '助手', copyText: '第三条' }); await nextTick();
    expect(host.querySelector('[data-message-id="c"] .qk-chat-message__footer[data-reveal]')).not.toBeNull();
    expect(host.querySelector('[data-message-id="d"] .qk-chat-message__footer[data-reveal]')).toBeNull();
    messages[0] = { ...messages[0]!, latest: true }; messages[1] = { ...messages[1]!, latest: false }; await nextTick();
    expect(host.querySelector('[data-message-id="a"] .qk-chat-message__footer[data-reveal]')).toBeNull();
    expect(host.querySelector('[data-message-id="b"] .qk-chat-message__footer[data-reveal]')).not.toBeNull();
    messages[1] = { ...messages[1]!, actionsVisibility: 'always' }; await nextTick();
    expect(host.querySelector('[data-message-id="b"] .qk-chat-message__footer[data-reveal]')).toBeNull();
  } finally { app.unmount(); }
});

it('forwards clipboard success and failure with the originating message id', async () => {
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const copied = vi.fn(); const failed = vi.fn(); const state = reactive({ text: '权威原文' });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(MessageList, { messages: [{ messageId: 'copy-me', author: '助手', copyText: state.text }], onCopy: copied, onCopyError: failed }) });
  app.mount(host);
  try {
    host.querySelector<HTMLButtonElement>('button[aria-label="复制回复"]')!.click();
    await vi.waitFor(() => expect(copied).toHaveBeenCalledWith({ messageId: 'copy-me' }));
    expect(write).toHaveBeenCalledWith('权威原文');
    state.text = '另一段'; await nextTick();
    const error = new Error('permission denied'); write.mockRejectedValue(error);
    host.querySelector<HTMLButtonElement>('button[aria-label="复制回复"]')!.click();
    await vi.waitFor(() => expect(failed).toHaveBeenCalledWith({ messageId: 'copy-me', value: '另一段', error }));
  } finally { app.unmount(); host.remove(); vi.restoreAllMocks(); }
});
