import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { expect, it } from 'vitest';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';
import { QuireChatMessageList, QuireChatComposer, QuireChatProcess, QuireChatTool, QuireChatReasoning, QuireChatMessageActions, QuireChatMessageBranch } from './index';

it('renders the public composition without a browser, protocol or parsing dependency', async () => {
  const html = await renderToString(createSSRApp({ render: () => h('div', [
    h(QuireChatMessageList, { messages: [{ messageId: 'host-id', author: '作者', align: 'end', parts: [{ id: 'text', kind: 'text', text: '<script>literal</script>' }] }] }),
    h(QuireChatComposer, { modelValue: '草稿' })
  ]) }));
  expect(html).toContain('data-message-key="host-id"');
  expect(html).toContain('aria-label="作者"');
  expect(html).toContain('&lt;script&gt;literal&lt;/script&gt;');
  expect(html).toContain('草稿');
  expect(html).not.toContain('<script>');
});

it('renders the public message family with inherited locale and safe content on the server', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(QuireLocaleProvider, { locale: 'ar' }, () => h(QuireChatProcess, { processId: 'process', title: '检查计划', defaultOpen: true }, () => [
    h(QuireChatReasoning, { part: { id: 'r', kind: 'reasoning', text: '<script>safe</script>' } }),
    h(QuireChatTool, { part: { id: 't', kind: 'tool', title: '读取计划', state: 'failed', error: '稍后重试', actions: [{ id: 'retry', label: '重试' }] } }),
    h(QuireChatMessageActions, { copyText: '原文', actions: [{ id: 'help', label: '有帮助', icon: 'thumbsUp' }] }),
    h(QuireChatMessageBranch, { branch: { ids: ['a', 'b'], selectedId: 'a' } })
  ])) }));
  expect(html).toContain('dir="rtl"'); expect(html).toContain('&lt;script&gt;safe&lt;/script&gt;');
  expect(html).toContain('稍后重试'); expect(html).toContain('1 / 2'); expect(html).not.toContain('<script>');
});
