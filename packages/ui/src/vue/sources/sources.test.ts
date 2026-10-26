// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from 'vue';
import { expect, it, vi } from 'vitest';
import type { QuireKitSource } from '../../components/sources';
import Sources from './sources.vue';
import Message from '../chat/message/message.vue';
import MessageList from '../chat/message-list/message-list.vue';
import InlineCitation from './inline-citation.vue';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';

const items: QuireKitSource[] = [
  { id: 'guide', title: '组件使用指南', label: '文档中心', description: '说明当前公共 API。' },
  { id: 'missing', title: '旧版本说明', unavailable: true }
];

it('keeps sources collapsed, exposes unavailable records and emits only host navigation intents', async () => {
  const navigate = vi.fn(); const update = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Sources, { sources: items, onNavigate: navigate, 'onUpdate:open': update }) }); app.mount(host);
  try {
    const trigger = host.querySelector<HTMLButtonElement>('.qk-collapsible__trigger')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click(); await nextTick();
    expect(update).toHaveBeenCalledWith(true);
    const links = host.querySelectorAll<HTMLButtonElement>('.qk-sources__link');
    expect(links).toHaveLength(2);
    expect(links[1]!.disabled).toBe(true);
    expect(host.textContent).toContain('来源不可用');
    links[0]!.click(); links[1]!.click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ sourceId: 'guide' });
    expect(host.querySelector('a')).toBeNull();
  } finally { app.unmount(); host.remove(); }
});

it('keeps source ownership through the default MessageList renderer', async () => {
  const navigate = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(MessageList, {
    messages: [{ messageId: 'reply', author: '助手', parts: [
      { id: 'source-part', kind: 'sources', sources: [{ id: 'document-7', title: '原始文档' }] }
    ] }], onSourceNavigate: navigate
  }) }); app.mount(host);
  try {
    host.querySelector<HTMLButtonElement>('.qk-sources .qk-collapsible__trigger')!.click();
    await nextTick();
    host.querySelector<HTMLButtonElement>('.qk-sources__link')!.click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ sourceId: 'document-7', messageId: 'reply', partId: 'source-part' });
  } finally { app.unmount(); host.remove(); }
});

it('preserves disclosure identity during a source update and scopes intents through MessagePart', async () => {
  const source = reactive({ title: '初始标题' }); const navigate = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Message, {
    author: '助手', messageId: 'answer', parts: [
      { id: 'body', kind: 'text', text: '可查阅下列依据。' },
      { id: 'sources', kind: 'sources', sources: [{ id: 'guide', title: source.title }] }
    ], onSourceNavigate: navigate
  }) }); app.mount(host);
  try {
    const trigger = host.querySelector<HTMLButtonElement>('.qk-sources .qk-collapsible__trigger')!;
    trigger.click(); await nextTick();
    source.title = '更新后的标题'; await nextTick();
    expect(host.querySelector('.qk-sources .qk-collapsible__trigger')).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    host.querySelector<HTMLButtonElement>('.qk-sources__link')!.click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ sourceId: 'guide', messageId: 'answer', partId: 'sources' });
  } finally { app.unmount(); host.remove(); }
});

it('follows the global language for titles, availability and accessible names', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const sources: QuireKitSource[] = [{ id: 'guide', title: 'Guide' }, { id: 'missing', title: 'Old notes', unavailable: true }];
  const app = createApp({ render: () => h(QuireLocaleProvider, { locale: 'en' }, () => [
    h(Sources, { sources, defaultOpen: true }), h(InlineCitation, { label: '[2]' })
  ]) }); app.mount(host);
  try {
    await nextTick();
    expect(host.querySelector('.qk-sources')?.getAttribute('aria-label')).toBe('Sources');
    const links = host.querySelectorAll<HTMLButtonElement>('.qk-sources__link');
    expect(links[0]!.getAttribute('aria-label')).toBe('View source: Guide');
    expect(links[1]!.getAttribute('aria-label')).toBe('Old notes: source unavailable');
    expect(host.querySelector('.qk-inline-citation__trigger')?.getAttribute('aria-label')).toBe('[2]: Source unavailable');
    expect(host.textContent).not.toMatch(/[\p{Script=Han}]/u);
  } finally { app.unmount(); host.remove(); }
});
