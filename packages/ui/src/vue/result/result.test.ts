import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { expect, it } from 'vitest';
import { QuireResult, type QuireKitResultStatus } from './index';

it('renders independent named results with native headings and escaped consumer content in SSR', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h('main', [
      h(QuireResult, { title: '<script>失败</script>', description: '保留当前输入', status: 'error', titleAs: 'h2' }),
      h(QuireResult, { title: '只有标题', icon: false, size: 'md' }),
    ]),
  }));
  const ids = Array.from(html.matchAll(/aria-labelledby="([^"]+)"/g), match => match[1]);
  expect(new Set(ids).size).toBe(2);
  for (const id of ids) expect(html).toContain(`id="${id}"`);
  expect(html).toContain('&lt;script&gt;失败&lt;/script&gt;');
  expect(html).toContain('<h2');
  expect(html.match(/aria-describedby=/g)).toHaveLength(1);
  expect(html.match(/qk-result__visual/g)).toHaveLength(1);
  expect(html).toContain('qk-result__icon--sm');
  expect(html).toContain('qk-result--md');
  expect(html).not.toContain('aria-live');
  expect(html).not.toContain('tabindex');
  expect(html).not.toContain('<button');
});

it.each<QuireKitResultStatus>(['info', 'success', 'warning', 'error', 'forbidden', 'not-found'])(
  'renders the %s illustration as decoration without requiring an icon provider', async (status) => {
    const html = await renderToString(createSSRApp({
      render: () => h(QuireResult, { title: '操作结果', status, illustrated: true, icon: false }),
    }));
    expect(html).toContain(`data-illustration="${status}"`);
    expect(html).toContain('viewBox="0 0 160 104"');
    expect(html).toContain('qk-result__illustration--sm');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    expect(html).not.toContain('qk-result__icon');
    expect(html).not.toContain('<img');
  },
);

it('selects exactly one visual and passes status and size to a standalone illustration slot', async () => {
  /**
   * Renders the competing visual inputs through the public component.
   * @param illustrated - Whether built-in artwork is requested.
   * @param custom - Whether a custom illustration slot is supplied.
   * @returns Server-rendered result markup.
   */
  const render = (illustrated: boolean, custom: boolean) => renderToString(createSSRApp({
    render: () => h(QuireResult, { title: '操作结果', status: 'success', size: 'sm', illustrated }, {
      ...(custom ? { illustration: ({ status, size }: { status: string; size: string }) => h('svg', { 'data-custom': `${status}-${size}` }) } : {}),
      icon: () => h('span', '自定义图标'),
    }),
  }));
  for (const illustrated of [false, true]) {
    const html = await render(illustrated, true);
    expect(html).toContain('data-custom="success-sm"');
    expect(html).not.toContain('data-illustration=');
    expect(html).not.toContain('自定义图标');
  }
  const builtin = await render(true, false);
  expect(builtin).toContain('data-illustration="success"');
  expect(builtin).not.toContain('自定义图标');
  const icon = await render(false, false);
  expect(icon).toContain('自定义图标');
  expect(icon).not.toContain('data-illustration=');
});

it('keeps detail lists and recovery controls as native consumer content after the summary', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(QuireResult, { title: '申请失败', label: '权限申请结果', status: 'forbidden', icon: false }, {
      title: () => '等待管理员处理',
      default: () => h('ul', [h('li', '申请人：当前用户')]),
      actions: () => h('button', { type: 'button' }, '撤回申请'),
    }),
  }));
  expect(html).toContain('aria-label="权限申请结果"');
  expect(html).not.toContain('aria-labelledby');
  expect(html).not.toContain('aria-describedby');
  expect(html).toContain('<button type="button">撤回申请</button>');
  expect(html.indexOf('等待管理员处理')).toBeLessThan(html.indexOf('<ul>'));
  expect(html.indexOf('</ul>')).toBeLessThan(html.indexOf('<button'));
});
