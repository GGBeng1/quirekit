// @vitest-environment happy-dom
import { createApp, createSSRApp, h, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { expect, it, vi } from 'vitest';
import InlineCitation from './inline-citation.vue';

it('keeps server-rendered citations inline without a block popup inside prose', async () => {
  const html = await renderToString(createSSRApp({ render: () => h('p', ['回答依据', h(InlineCitation, { label: '[1]' })]) }));
  expect(html).toContain('<sup class="qk-inline-citation"');
  expect(html).toContain('qk-inline-citation__trigger');
  expect(html).not.toContain('qk-popover__positioner');
});

it('previews a citation and requires a separate action before requesting navigation', async () => {
  const navigate = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(InlineCitation, {
    label: '[1]', source: { id: 'spec', title: '交互规范', label: '文档中心', description: '键盘与触摸都能预览。', quote: '正文与来源保留独立身份。', href: '/spec' },
    onNavigate: navigate
  }) }); app.mount(host);
  try {
    const trigger = host.querySelector<HTMLButtonElement>('.qk-inline-citation__trigger')!;
    trigger.click();
    await vi.waitFor(() => expect(document.querySelector('.qk-inline-citation__content')).not.toBeNull());
    expect(navigate).not.toHaveBeenCalled();
    expect(document.querySelector('.qk-inline-citation__content')?.textContent).toContain('正文与来源保留独立身份。');
    document.querySelector<HTMLButtonElement>('.qk-inline-citation__content button')!.click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ sourceId: 'spec', href: '/spec' });
    await nextTick();
  } finally { app.unmount(); host.remove(); }
});

it('shows an explicit missing-source preview without exposing a navigation action', async () => {
  const navigate = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(InlineCitation, { label: '[?]', onNavigate: navigate }) }); app.mount(host);
  try {
    host.querySelector<HTMLButtonElement>('button')!.click();
    await vi.waitFor(() => expect(document.querySelector('.qk-inline-citation__content')).not.toBeNull());
    const card = document.querySelector('.qk-inline-citation__content')!;
    expect(card.textContent).toContain('来源不可用');
    expect(card.querySelector('button')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  } finally { app.unmount(); host.remove(); }
});
