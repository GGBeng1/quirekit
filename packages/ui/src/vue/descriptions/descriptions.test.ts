import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { expect, it } from 'vitest';
import { QuireDescriptions, type QuireKitDescriptionItem } from './index';

it('preserves native pairs, literal strings, zero and localized missing values during SSR', async () => {
  const items = Object.freeze([
    { key: 'zero', label: '次数', value: 0 }, { key: 'nil', label: '备注', value: null },
    { key: 'empty', label: '空值', value: '' }, { key: 'literal', label: '内容', value: '<img src=x>' }
  ]);
  const html = await renderToString(createSSRApp({ render: () => h(QuireDescriptions, { items, title: '详情', emptyValue: '未设置' }) }));
  expect(html.replace(/<!--[\s\S]*?-->/g, '')).toMatch(/<h3 id="([^"]+)"[^>]*>详情<\/h3>/);
  const id = html.match(/<h3 id="([^"]+)"/)![1];
  expect(html).toContain(`aria-labelledby="${id}"`);
  expect(html.match(/<dt /g)).toHaveLength(4);
  expect(html.match(/<dd /g)).toHaveLength(4);
  expect(html.replace(/<!--[\s\S]*?-->/g, '')).toContain('>0</dd>');
  expect(html.match(/未设置/g)).toHaveLength(2);
  expect(html).toContain('&lt;img src=x&gt;');
  expect(html).not.toContain('role="table"');
});

it('keeps empty lists empty and lets slots own interactive values', async () => {
  const empty = await renderToString(createSSRApp({ render: () => h(QuireDescriptions, { items: [], label: '属性' }) }));
  expect(empty).toContain('aria-label="属性"');
  expect(empty).not.toContain('<dt');
  expect(empty).not.toContain('qk-descriptions__header');
  const html = await renderToString(createSSRApp({ render: () => h(QuireDescriptions, {
    items: [{ key: 'file', label: '名称', value: '项目', span: 'full' }]
  }, {
    value: ({ item, index }: { item: QuireKitDescriptionItem; index: number }) => h('button', { type: 'button' }, `${index}: ${item.value}`)
  }) }));
  expect(html).toContain('<button type="button">0: 项目</button>');
  expect(html).toContain('grid-column:1 / -1');
  expect(html).not.toContain('tabindex');
});
