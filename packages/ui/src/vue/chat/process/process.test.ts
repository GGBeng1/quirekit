// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from 'vue';
import { expect, it } from 'vitest';
import Process from './process.vue';
import Reasoning from '../reasoning/reasoning.vue';
import Tool from '../tool/tool.vue';
import QuireLocaleProvider from '../../locale-provider/locale-provider.vue';
import type { QuireKitChatProcessState } from '../../../components/chat';

it('composes public process units, retains their identity and keeps necessary actions outside the fold', async () => {
  const state = reactive({ id: 'p', state: 'running' as QuireKitChatProcessState, text: '第一步', open: true });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(QuireLocaleProvider, { locale: 'ar' }, () => h(Process, { processId: state.id, title: '检查项目', state: state.state, open: state.open }, {
    default: () => [h(Reasoning, { part: { id: 'r', kind: 'reasoning', text: state.text } }), h(Process, { processId: 'nested', title: '分组步骤', defaultOpen: true }, () => h(Tool, { part: { id: 't', kind: 'tool', title: '读取记录', state: 'succeeded', output: '完成' } }))],
    actions: () => h('button', { 'data-confirm': '' }, '确认继续')
  })) }); app.mount(host);
  try {
    const trigger = host.querySelector<HTMLButtonElement>('[data-part="trigger"]')!;
    const text = host.querySelector('.qk-chat-part__text');
    expect(trigger.getAttribute('dir')).toBe('rtl');
    expect(host.querySelectorAll('.qk-chat-process__details--steps')).toHaveLength(2);
    expect(host.querySelectorAll('.qk-chat-process__details--detail')).toHaveLength(2);
    state.state = 'complete'; state.text += '，第二步'; await nextTick();
    expect(host.querySelector('.qk-chat-part__text')).toBe(text);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    state.open = false; await nextTick();
    expect(host.querySelector('[data-confirm]')?.closest('[data-part="content"]')).toBeNull();
    expect(host.querySelector('[data-confirm]')).not.toBeNull();
  } finally { app.unmount(); host.remove(); }
});
