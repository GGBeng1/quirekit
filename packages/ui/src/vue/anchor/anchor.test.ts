import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { expect, it } from 'vitest';
import { QuireAnchor } from './index';

it('renders nested native links and encoded IDs without browser globals', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(QuireAnchor, {
    title: '本页内容', items: [{ id: '简介', label: '简介', children: [{ id: '100%', label: '完整说明' }] }]
  }) }));
  expect(html).toContain('aria-label="本页内容"');
  expect(html).toContain('href="#%E7%AE%80%E4%BB%8B"');
  expect(html).toContain('href="#100%25"');
  expect(html.match(/<ol/g)).toHaveLength(2);
  expect(html).not.toContain('aria-current');
});
it('does not emit an empty navigation landmark', async () => {
  expect(await renderToString(createSSRApp({ render: () => h(QuireAnchor, { items: [] }) }))).not.toContain('<nav');
});
