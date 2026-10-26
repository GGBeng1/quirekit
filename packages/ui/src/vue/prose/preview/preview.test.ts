// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, onMounted, ref } from 'vue';
import { expect, it, vi } from 'vitest';
import { QuireProsePreview } from '../index';

it('defers source once while preserving the preview DOM and its input value', async () => {
  const mounted = vi.fn();
  const Source = defineComponent({ setup() { onMounted(mounted); return () => h('code', { 'data-source': '' }, 'source'); } });
  const Preview = defineComponent({ setup() {
    const text = ref('draft');
    return () => h('input', { value: text.value, onInput: (event: Event) => { text.value = (event.target as HTMLInputElement).value; } });
  } });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(QuireProsePreview, {}, { default: () => h(Preview), source: () => h(Source) }) });
  app.mount(host);
  try {
    const input = host.querySelector('input')!; input.value = 'edited'; input.dispatchEvent(new Event('input')); await nextTick();
    expect(mounted).not.toHaveBeenCalled();
    const tabs = host.querySelectorAll<HTMLButtonElement>('[role=tab]');
    tabs[1]!.click(); await vi.waitFor(() => expect(mounted).toHaveBeenCalledTimes(1));
    tabs[0]!.click(); await nextTick();
    expect(host.querySelector('input')).toBe(input); expect(input.value).toBe('edited');
    tabs[1]!.click(); await nextTick(); expect(mounted).toHaveBeenCalledTimes(1);
  } finally { app.unmount(); host.remove(); }
});
