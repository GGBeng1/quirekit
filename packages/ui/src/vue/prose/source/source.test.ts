import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { expect, it } from 'vitest';
import { QuireProseSource, quireProseComponents, quireRichProseComponents } from '../index';

it('keeps native defaults while exposing the two rich renderer replacements', () => {
  expect(Object.isFrozen(quireRichProseComponents)).toBe(true);
  expect(quireRichProseComponents.pre).toBe(QuireProseSource);
  expect(quireRichProseComponents.img).not.toBe(quireProseComponents.img);
  for (const tag of Object.keys(quireProseComponents) as (keyof typeof quireProseComponents)[]) {
    if (tag !== 'img' && tag !== 'pre') expect(quireRichProseComponents[tag]).toBe(quireProseComponents[tag]);
  }
});

it('adapts fence metadata and embedded presentation without leaking metadata into native attributes', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(QuireProseSource, { code: '<script>\n  value\n', language: null, filename: 'sample.vue', highlights: [2], meta: 'example', presentation: 'embedded' }) }));
  expect(html).toContain('data-variant="plain"'); expect(html).toContain('data-density="compact"');
  expect(html).toContain('aria-label="复制代码"'); expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('data-highlighted');
  expect(html).not.toMatch(/\s(?:language|highlights|meta|presentation)=/u);
});

it('passes one complete code slot through while retaining exact source in its slot context', async () => {
  const source = '<p>literal</p>\n\n';
  let original: string | undefined;
  const html = await renderToString(createSSRApp({ render: () => h(QuireProseSource, { code: source }, { default: (props: { code: string }) => { original = props.code; return h('code', {}, h('span', { class: 'syntax' }, 'Highlighted')); } }) }));
  expect(original).toBe(source);
  expect(html.match(/<pre\b/gu)).toHaveLength(1); expect(html.match(/<code\b/gu)).toHaveLength(1);
  expect(html).toContain('<span class="syntax">Highlighted</span>');
});

it('keeps document and embedded source collapsed behind an accessible arrow by default', async () => {
  for (const presentation of ['document', 'embedded'] as const) {
    const html = await renderToString(createSSRApp({ render: () => h(QuireProseSource, { code: 'const value = 1', presentation }) }));
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/<pre[^>]*\shidden(?:\s|>)/u);
    expect(html).toContain('aria-label="展开代码"');
    expect(html).not.toMatch(/>展开代码</u);
  }
});
