// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, onMounted, onUpdated, reactive } from 'vue';
import { expect, it, vi } from 'vitest';
import type { QuireKitChatMessagePart, QuireKitChatReasoningPart, QuireKitChatToolPart } from '../../../components/chat';
import Part from './message-part.vue';
import Message from '../message/message.vue';

it('shows tool input and output without headers while preserving labels and source copying', async () => {
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const part = reactive<QuireKitChatToolPart>({ id: 'tool', kind: 'tool', title: '读取记录', state: 'succeeded', input: '{"path":"notes.md"}', output: '第一行\n第二行\n' });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Part, { part, defaultOpen: true }) }); app.mount(host);
  try {
    expect(host.querySelectorAll('.qk-code-block')).toHaveLength(2);
    expect(host.querySelector('.qk-code-block__header')).toBeNull();
    expect(host.querySelectorAll('.qk-code-block__floating')).toHaveLength(2);
    expect([...host.querySelectorAll('pre')].map(node => node.getAttribute('aria-label'))).toEqual(['输入', '输出']);
    const output = host.querySelectorAll('.qk-code-block')[1]!;
    output.querySelector<HTMLButtonElement>('button')!.click();
    await vi.waitFor(() => expect(write).toHaveBeenCalledWith(part.output));
    Object.assign(part, { output: '追加后的原始结果\r\n' }); await nextTick();
    expect(host.querySelectorAll('.qk-code-block')[1]).toBe(output);
    output.querySelector<HTMLButtonElement>('button')!.click();
    await vi.waitFor(() => expect(write).toHaveBeenLastCalledWith(part.output));
  } finally { app.unmount(); host.remove(); write.mockRestore(); }
});

it('preserves disclosure across streaming/settled updates and resets it for a new identity', async () => {
  const part = reactive<QuireKitChatReasoningPart>({ id: 'thought', kind: 'reasoning', text: '正在分析', state: 'streaming' });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Part, { part }) }); app.mount(host);
  try {
    const trigger = host.querySelector<HTMLButtonElement>('[data-part="trigger"]')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click(); await nextTick();
    const content = host.querySelector('.qk-chat-part__text');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    Object.assign(part, { text: '正在分析，已经完成', state: 'complete' }); await nextTick();
    expect(host.querySelector('.qk-chat-part__text')).toBe(content);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    Object.assign(part, { id: 'next' }); await nextTick();
    expect(host.querySelector('[data-part="trigger"]')!.getAttribute('aria-expanded')).toBe('false');
  } finally { app.unmount(); host.remove(); }
});

it('keeps controlled disclosure focus safe and preserves failed tool output with scoped intents', async () => {
  const state = reactive({ open: true }); const action = vi.fn();
  const part = reactive<QuireKitChatToolPart>({ id: 'tool', kind: 'tool', title: '检查计划', state: 'failed', output: '已检查 2 项', error: '第 3 项未完成', outputTruncated: '仅显示部分结果', actions: [{ id: 'retry', label: '重试' }] });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Part, { part, messageId: 'message', open: state.open, onAction: action }, {
    'tool-output': () => h('button', { 'data-output-action': '' }, '检查输出')
  }) }); app.mount(host);
  try {
    expect(host.textContent).toContain('第 3 项未完成');
    host.querySelector<HTMLButtonElement>('[data-output-action]')!.focus();
    state.open = false; await nextTick();
    expect(document.activeElement).toBe(host.querySelector('[data-part="trigger"]'));
    await vi.waitFor(() => expect(host.querySelector('[data-part="trigger"]')!.getAttribute('aria-expanded')).toBe('false'));
    [...host.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === '重试')!.click();
    expect(action).toHaveBeenCalledWith({ messageId: 'message', partId: 'tool', actionId: 'retry' });
    Object.assign(part, { state: 'succeeded' }); await nextTick();
    expect(host.querySelector('[data-part="trigger"]')!.getAttribute('aria-expanded')).toBe('false');
  } finally { app.unmount(); host.remove(); }
});

it('does not remount or update a stable custom prefix when another part streams', async () => {
  const mounts = vi.fn(); const updates = vi.fn();
  const Stable = defineComponent({ setup() { onMounted(mounts); onUpdated(updates); return () => h('button', '固定内容'); } });
  const parts = reactive<QuireKitChatMessagePart[]>([
    { id: 'fixed', kind: 'custom', name: '既有内容', fallback: '回退' }, { id: 'tail', kind: 'text', text: '尾部' }
  ]);
  const state = reactive({ messageId: 'one' });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Message, { author: '助手', messageId: state.messageId, parts }, { custom: () => h(Stable) }) }); app.mount(host);
  try {
    const original = host.querySelector('[data-part-id="fixed"]');
    for (let i = 0; i < 5; i++) { Object.assign(parts[1]!, { text: `尾部 ${i}` }); await nextTick(); }
    expect(mounts).toHaveBeenCalledTimes(1); expect(updates).not.toHaveBeenCalled();
    expect(host.querySelector('[data-part-id="fixed"]')).toBe(original);
    host.querySelector<HTMLButtonElement>('button')!.focus();
    parts.splice(0, 1); await nextTick();
    expect(document.activeElement).toBe(host.querySelector('article'));
    state.messageId = 'two'; await nextTick();
    expect(host.querySelector('[data-part-id="fixed"]')).toBeNull();
  } finally { app.unmount(); host.remove(); }
});

it('escapes unsupported markdown, never dumps custom data and blocks copying a truncated output', () => {
  const host = document.createElement('div');
  const app = createApp({ render: () => h('div', [
    h(Part, { part: { id: 'md', kind: 'text', format: 'markdown', text: '<img src=x onerror=alert(1)>' } }),
    h(Part, { part: { id: 'custom', kind: 'custom', name: '图表', fallback: '图表暂不可用', data: { secret: 'must-not-render' } } }),
    h(Part, { part: { id: 'unknown', kind: 'future' } as unknown as QuireKitChatMessagePart }),
    h(Part, { defaultOpen: true, part: { id: 'tool', kind: 'tool', title: '结果', state: 'succeeded', output: 'partial', outputTruncated: '输出已截断' } })
  ]) }); app.mount(host);
  try {
    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('未配置 Markdown renderer');
    expect(host.textContent).toContain('图表暂不可用');
    expect(host.textContent).not.toContain('must-not-render');
    expect(host.textContent).toContain('暂不支持此内容类型');
    expect(host.textContent).toContain('输出已截断');
    expect(host.querySelector('.qk-clipboard')).toBeNull();
  } finally { app.unmount(); }
});

it('forwards approval and question intents with message, part and request identities', async () => {
  const approval = vi.fn();
  const draftChange = vi.fn();
  const openQuestion = vi.fn();
  const submit = vi.fn();
  const parts = reactive<QuireKitChatMessagePart[]>([
    { id: 'approval-part', kind: 'confirmation', requestId: 'approval-request', title: '读取文件？', state: 'pending' },
    { id: 'question-part', kind: 'question', requestId: 'question-request', title: '选择范围', state: 'pending',
      questions: [{ id: 'scope', title: '范围', kind: 'single', options: [{ value: 'docs', label: '文档' }] }] },
    { id: 'question-prompt', kind: 'question', requestId: 'prompt-request', title: '选择下一步', state: 'pending', presentation: 'prompt',
      questions: [{ id: 'next', title: '下一步', kind: 'single', options: [{ value: 'test', label: '测试' }] }] }
  ]);
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Message, { author: '助手', messageId: 'message-1', parts,
    onConfirmationDecision: approval, onQuestionDraftChange: draftChange, onQuestionOpen: openQuestion, onQuestionSubmit: submit
  }) }); app.mount(host);
  try {
    host.querySelector<HTMLButtonElement>('.qk-chat-confirmation button')!.click();
    expect(approval).toHaveBeenCalledWith({ messageId: 'message-1', partId: 'approval-part', requestId: 'approval-request', decision: 'approve' });
    host.querySelector<HTMLInputElement>('input[type="radio"][value="docs"]')!.click();
    await nextTick();
    expect(draftChange).toHaveBeenCalledWith({ messageId: 'message-1', partId: 'question-part', answers: [{ questionId: 'scope', value: 'docs' }] });
    host.querySelector<HTMLButtonElement>('.qk-chat-question .qk-chat-decision__actions button')!.click();
    expect(submit).toHaveBeenCalledWith({ messageId: 'message-1', partId: 'question-part', requestId: 'question-request', answers: [{ questionId: 'scope', value: 'docs' }] });
    host.querySelector<HTMLButtonElement>('.qk-chat-question--prompt button')!.click();
    expect(openQuestion).toHaveBeenCalledWith({ messageId: 'message-1', partId: 'question-prompt', requestId: 'prompt-request' });
  } finally { app.unmount(); host.remove(); }
});
