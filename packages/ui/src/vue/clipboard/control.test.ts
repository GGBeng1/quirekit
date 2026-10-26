// @vitest-environment happy-dom
import { createApp, h, nextTick } from 'vue';
import { expect, it, vi } from 'vitest';
import type { QuireKitClipboardControlSlotProps } from '../../components/clipboard';
import Clipboard from './clipboard.vue';

it('supports a real custom control without nested buttons, premature success or focus loss', async () => {
  let complete!: () => void;
  const promise = new Promise<void>(resolve => { complete = resolve; });
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockReturnValue(promise);
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Clipboard, { value: 'QK', mode: 'icon' }, {
    control: (control: QuireKitClipboardControlSlotProps) => h('button', { disabled: control.disabled, 'aria-disabled': control.copying, onClick: control.copy }, control.copied ? '已复制' : '复制')
  }) }); app.mount(host);
  try {
    expect(host.querySelectorAll('button')).toHaveLength(1);
    const button = host.querySelector<HTMLButtonElement>('button')!;
    button.focus(); button.click(); button.click(); await nextTick();
    expect(write).toHaveBeenCalledExactlyOnceWith('QK');
    expect(button.textContent).toBe('复制'); expect(button.disabled).toBe(false);
    expect(document.activeElement).toBe(button);
    complete(); await promise; await nextTick();
    expect(button.textContent).toBe('已复制'); expect(document.activeElement).toBe(button);
  } finally { app.unmount(); host.remove(); write.mockRestore(); }
});
