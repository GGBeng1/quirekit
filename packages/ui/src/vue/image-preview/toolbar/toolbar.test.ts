// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from 'vue';
import { expect, it, vi } from 'vitest';
import { zhCN as imagePreviewLabels } from '../../../locale/components/image-preview';
import Toolbar from './toolbar.vue';
it('renders configured order, restores fit from the scale button, and keeps navigation independent of image load', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const fit = vi.fn(); const rotate = vi.fn(); const navigate = vi.fn();
  const state = reactive({ ready: false, index: 0 });
  const app = createApp({ render: () => h(Toolbar, {
    configuration: { layout: ['next', { slot: 'save' }, 'scale', 'previous', 'rotateLeft', 'counter'] },
    ...state, scale: .5, minimum: .1, count: 3, loop: false, labels: imagePreviewLabels,
    onFit: fit, onRotate: rotate, onNavigate: navigate
  }, { item: ({ slot }: { slot: string }) => h('button', slot) }) });
  app.mount(host);
  try {
    const buttons = () => [...host.querySelectorAll('button')];
    expect(buttons().map(button => button.getAttribute('aria-label') || button.textContent)).toEqual(['下一张', 'save', '适应窗口', '上一张', '向左旋转']);
    expect(buttons()[0]!.disabled).toBe(false); expect(buttons()[2]!.disabled).toBe(true); expect(buttons()[3]!.disabled).toBe(true);
    buttons()[0]!.click(); expect(navigate).toHaveBeenCalledWith(1);
    state.ready = true; state.index = 2; await nextTick();
    expect(buttons()[0]!.disabled).toBe(true); expect(buttons()[3]!.disabled).toBe(false);
    buttons()[2]!.click(); expect(fit).toHaveBeenCalledOnce();
    expect(buttons()[2]!.style.textDecoration).toBe('none');
    buttons()[4]!.click(); expect(rotate).toHaveBeenCalledWith(-1);
    expect(host.querySelector('[aria-label="当前图片"]')?.textContent).toBe('3 / 3');
  } finally { app.unmount(); host.remove(); }
});
