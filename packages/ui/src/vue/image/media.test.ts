// @vitest-environment happy-dom
import { createApp, h, nextTick, ref } from 'vue';
import { expect, it, vi } from 'vitest';
import Media from './media.vue';

it('ignores stale load/error from a replaced image and reports the current resource', async () => {
  const source = ref('a.svg'); const load = vi.fn(); const error = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Media, { key: source.value, src: source.value, alt: 'Artwork', onLoad: load, onError: error }) });
  app.mount(host); const old = host.querySelector('img')!;
  source.value = 'b.svg'; await nextTick(); load.mockClear(); error.mockClear();
  Object.defineProperty(old, 'naturalWidth', { value: 100 }); old.dispatchEvent(new Event('load')); old.dispatchEvent(new Event('error'));
  expect(load).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
  const current = host.querySelector('img')!; Object.defineProperty(current, 'naturalWidth', { value: 100 });
  current.dispatchEvent(new Event('load')); current.dispatchEvent(new Event('load'));
  expect(load).toHaveBeenCalledOnce();
  app.unmount(); host.remove();
});


it('reports a new responsive candidate without duplicating the same load', () => {
  const host = document.createElement('div'); document.body.append(host);
  const loaded = vi.fn();
  const app = createApp({ render: () => h(Media, { src: 'small.svg', alt: '海岸', onLoad: loaded }) });
  app.mount(host);
  try {
    const image = host.querySelector('img')!;
    let candidate = 'small.svg';
    Object.defineProperties(image, { naturalWidth: { value: 800 }, currentSrc: { get: () => candidate } });
    image.dispatchEvent(new Event('load')); image.dispatchEvent(new Event('load'));
    expect(loaded).toHaveBeenCalledTimes(1);
    candidate = 'large.svg'; image.dispatchEvent(new Event('load'));
    expect(loaded).toHaveBeenCalledTimes(2);
  } finally { app.unmount(); host.remove(); }
});
