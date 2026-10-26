// @vitest-environment happy-dom
import { createApp, h, nextTick, type VNode } from 'vue';
import { afterEach, expect, it } from 'vitest';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';
import { QuireChatComposer, QuireChatConfirmation, QuireChatMessage, QuireChatMessageList, QuireChatQuestion } from './index';

const han = /[\p{Script=Han}]/u;
const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); });

/** @param locale - Active language, or undefined for the default. @param render - Content under the provider. @returns Mounted host. */
async function mount(locale: string | undefined, render: () => VNode | VNode[]): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({ render: () => locale === undefined ? render() : h(QuireLocaleProvider, { locale }, render) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return host;
}

it('renders composer, message and part chrome in English', async () => {
  const host = await mount('en', () => [
    h(QuireChatComposer, { modelValue: '' }),
    h(QuireChatMessage, {
      author: 'Assistant', messageId: 'm', state: 'error', copyText: 'body',
      branch: { ids: ['a', 'b'], selectedId: 'a' },
      actions: [{ id: 'x', label: 'Extra', placement: 'more', when: 'always' }],
      parts: [
        { id: 'r', kind: 'reasoning', text: 'thinking' },
        { id: 't', kind: 'tool', title: 'Read file', state: 'running' },
        { id: 'p', kind: 'text', text: '# Title', format: 'markdown', state: 'stopped' }
      ]
    })
  ]);
  expect(host.querySelector('textarea')?.getAttribute('aria-label')).toBe('Message');
  expect(host.querySelector('textarea')?.getAttribute('placeholder')).toBe('Type a message…');
  expect(host.querySelector('[data-mode="submit"]')?.getAttribute('aria-label')).toBe('Send');
  expect(host.textContent).toContain('Reasoning');
  expect(host.textContent).toContain('Running');
  expect(host.textContent).toContain('No Markdown renderer configured');
  expect(host.textContent).toContain('Generation stopped');
  expect(host.textContent).toContain('1 / 2');
  expect(host.querySelector('[data-action-id="previous"]')?.getAttribute('aria-label')).toBe('Previous version');
  expect(host.querySelector('[data-action-id="copy"]')?.getAttribute('aria-label')).toBe('Copy reply');
  expect(host.querySelector('[data-action-id="more"]')?.getAttribute('aria-label')).toBe('More actions');
  expect(host.textContent).not.toMatch(han);
});

it('renders message list, confirmation and question text in English', async () => {
  const host = await mount('en', () => [
    h(QuireChatMessageList, { messages: [], hasOlder: true }),
    h(QuireChatConfirmation, { requestId: 'c', title: 'Delete file', state: 'pending' }),
    h(QuireChatQuestion, { requestId: 'q', title: 'Preferences', state: 'pending', questions: [
      { id: 'a', title: 'Tone', kind: 'single', options: [{ value: 'formal', label: 'Formal' }] },
      { id: 'b', title: 'Notes', kind: 'text' }
    ] })
  ]);
  expect(host.textContent).toContain('Load earlier messages');
  expect(host.textContent).toContain('No messages yet');
  expect(host.textContent).toContain('Allow');
  expect(host.textContent).toContain('Deny');
  expect(host.textContent).toContain('Awaiting confirmation');
  expect(host.textContent).toContain('1 of 2');
  host.querySelector<HTMLButtonElement>('.qk-chat-question .qk-chat-decision__actions button')!.click();
  await nextTick();
  expect(host.textContent).toContain('Please answer this question');
  expect(host.textContent).not.toMatch(han);
});

it('keeps the default Chinese text and host-supplied instance names without a provider', async () => {
  const host = await mount(undefined, () => [
    h(QuireChatComposer, { modelValue: '', label: '工作区指令' }),
    h(QuireChatMessageList, { messages: [] })
  ]);
  expect(host.querySelector('textarea')?.getAttribute('aria-label')).toBe('工作区指令');
  expect(host.querySelector('textarea')?.getAttribute('placeholder')).toBe('输入消息…');
  expect(host.querySelector('[data-mode="submit"]')?.getAttribute('aria-label')).toBe('发送');
  expect(host.textContent).toContain('暂无消息');
});
