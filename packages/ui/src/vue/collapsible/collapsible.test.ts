// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from 'vue';
import { expect, it } from 'vitest';
import Collapsible from './collapsible.vue';

it('adds a plain public surface without changing the independent default and returns controlled focus', async () => {
  const state = reactive({ open: true });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h('div', [
    h(Collapsible, { title: '普通面板' }, () => '原有内容'),
    h(Collapsible, { title: '过程行', variant: 'plain', triggerVariant: 'text', open: state.open }, () => h('button', { id: 'inside' }, '内部操作'))
  ]) }); app.mount(host);
  try {
    expect(host.querySelector('.qk-collapsible')!.classList.contains('qk-collapsible--plain')).toBe(false);
    expect(host.querySelector('.qk-collapsible__trigger--ghost')).not.toBeNull();
    const plain = host.querySelector('.qk-collapsible--plain')!;
    expect(plain.querySelector('.qk-collapsible__trigger--plain')).not.toBeNull();
    expect(plain.querySelector('.qk-collapsible__trigger--text')).not.toBeNull();
    host.querySelector<HTMLButtonElement>('#inside')!.focus(); state.open = false; await nextTick();
    expect(document.activeElement).toBe(plain.querySelector('button'));
    expect(plain.querySelector('#inside')).not.toBeNull();
  } finally { app.unmount(); host.remove(); }
});
