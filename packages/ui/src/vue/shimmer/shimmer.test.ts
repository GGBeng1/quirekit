// @vitest-environment happy-dom
import { createApp, createSSRApp, h, nextTick, reactive } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { expect, it } from 'vitest';
import Shimmer from './shimmer.vue';

it('keeps one readable text node through active and content changes without adding announcements', async () => {
  const state = reactive({ text: '正在思考', active: true, duration: 1200 });
  const host = document.createElement('div');
  const app = createApp({ render: () => h(Shimmer, { ...state, dir: 'rtl' }) });
  app.mount(host);
  try {
    const node = host.querySelector('span')!;
    expect(node.textContent).toBe('正在思考');
    expect(node.childNodes).toHaveLength(1);
    expect(node.getAttribute('data-active')).toBe('true');
    expect(node.style.getPropertyValue('--qk-shimmer-duration')).toBe('1200ms');
    expect(node.getAttribute('dir')).toBe('rtl');
    expect(node.hasAttribute('role')).toBe(false);
    expect(node.hasAttribute('aria-live')).toBe(false);
    expect(node.hasAttribute('aria-hidden')).toBe(false);
    state.active = false; state.text = '已完成'; await nextTick();
    expect(host.querySelector('span')).toBe(node);
    expect(node.textContent).toBe('已完成');
    expect(node.getAttribute('data-active')).toBe('false');
    for (const duration of [0, -1, NaN, Infinity]) {
      state.duration = duration; await nextTick();
      expect(node.style.getPropertyValue('--qk-shimmer-duration')).toBe('');
    }
  } finally { app.unmount(); }
});

it('renders safe readable text on the server without browser or Chat dependencies', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(Shimmer, { text: '<script>wait</script>' }) }));
  expect(html).toContain('&lt;script&gt;wait&lt;/script&gt;');
  expect(html).toContain('data-active="true"');
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('aria-hidden');
});
