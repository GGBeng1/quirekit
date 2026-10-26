// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from 'vue';
import { expect, it, vi } from 'vitest';
import Image from './image.vue';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';

/** @param element - Native resource completing its request. @param src - Browser-selected candidate. */
function complete(element: HTMLImageElement, src = element.src): void {
  Object.defineProperties(element, { naturalWidth: { value: 800 }, naturalHeight: { value: 500 }, currentSrc: { value: src } });
  element.dispatchEvent(new Event('load'));
}

it('delegates preview to a virtualized consumer without opening a second dialog', async () => {
  const pending = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
  const preview = vi.fn((event: MouseEvent) => event.preventDefault());
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Image, { src: '/small.svg', alt: '图片', preview: true, onPreview: preview }) });
  app.mount(host);
  try {
    complete(host.querySelector('img')!); await nextTick();
    host.querySelector<HTMLButtonElement>('.qk-image__trigger')!.click();
    await nextTick();
    expect(preview).toHaveBeenCalledOnce();
    expect(document.querySelector('.qk-image-preview__image')).toBeNull();
  } finally { app.unmount(); host.remove(); pending.mockRestore(); }
});

it('uses a fallback once, retries the original and resets when the source changes', async () => {
  const pending = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
  const host = document.createElement('div'); document.body.append(host);
  const state = reactive({ src: '/original.svg' }); const error = vi.fn();
  const app = createApp({ render: () => h(Image, { ...state, alt: '海岸', fallback: '/fallback.svg', srcset: '/large.svg 2x', preview: true, onError: error }) });
  app.mount(host);
  try {
    const original = host.querySelector('img')!;
    original.dispatchEvent(new Event('error')); await nextTick();
    const fallback = host.querySelector('img')!;
    expect(fallback.getAttribute('src')).toBe('/fallback.svg'); expect(fallback.hasAttribute('srcset')).toBe(false);
    fallback.dispatchEvent(new Event('error')); await nextTick();
    expect(host.querySelector('.qk-image')?.getAttribute('data-state')).toBe('error');
    host.querySelector<HTMLButtonElement>('button')!.click(); await nextTick();
    expect(host.querySelector('img')?.getAttribute('src')).toBe('/original.svg');
    host.querySelector('img')!.dispatchEvent(new Event('error')); await nextTick();
    complete(host.querySelector('img')!); await nextTick();
    expect(host.querySelector('.qk-image')?.getAttribute('data-fallback')).toBe('true');
    expect(host.querySelector('.qk-image__trigger')).toBeNull();
    state.src = '/new.svg'; await nextTick();
    expect(host.querySelector('img')?.getAttribute('src')).toBe('/new.svg');
    complete(host.querySelector('img')!); await nextTick();
    expect(host.querySelector('.qk-image__trigger')).not.toBeNull();
    expect(error).toHaveBeenCalledTimes(3);
  } finally { app.unmount(); host.remove(); pending.mockRestore(); }
});

it('forwards image request attributes and previews the actual responsive candidate', async () => {
  const pending = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Image, {
    src: '/small.svg', alt: '海岸', preview: true, position: 'left top', width: 320, height: 200,
    loading: 'eager', decoding: 'sync', fetchpriority: 'high', crossorigin: 'anonymous', referrerpolicy: 'no-referrer'
  }) });
  app.mount(host);
  try {
    const image = host.querySelector('img')!;
    for (const [key, value] of Object.entries({ width: '320', height: '200', loading: 'eager', decoding: 'sync', fetchpriority: 'high', crossorigin: 'anonymous', referrerpolicy: 'no-referrer' })) expect(image.getAttribute(key)).toBe(value);
    expect(image.style.objectPosition).toBe('left top');
    complete(image, 'https://example.test/large.svg'); await nextTick();
    host.querySelector<HTMLButtonElement>('.qk-image__trigger')!.click();
    await vi.waitFor(() => expect(document.querySelector('.qk-image-preview__image')?.getAttribute('src')).toBe('https://example.test/large.svg'));
  } finally { app.unmount(); host.remove(); pending.mockRestore(); }
});

it('honors compact explicit dimensions without dropping the keyboard preview trigger', async () => {
  const pending = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
  const host = document.createElement('div');
  const app = createApp({ render: () => h(Image, { src: '/small.svg', alt: '缩略图', width: 24, height: 24, preview: true, previewHint: false }) }); app.mount(host);
  try {
    const root = host.querySelector<HTMLElement>('.qk-image')!;
    expect(root.style.width).toBe('24px'); expect(parseFloat(root.style.minWidth)).toBe(0); expect(parseFloat(root.style.minHeight)).toBe(0);
    complete(host.querySelector('img')!); await nextTick();
    expect(host.querySelector('button')?.getAttribute('aria-label')).toBe('预览：缩略图');
    expect(host.querySelector('.qk-image__hint')).toBeNull();
  } finally { app.unmount(); pending.mockRestore(); }
});

it('takes loading, failure and preview text from the active language', async () => {
  const pending = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
  const host = document.createElement('div');
  const app = createApp({ render: () => h(QuireLocaleProvider, { locale: 'en' }, () => h(Image, { src: '/small.svg', alt: '', preview: true })) }); app.mount(host);
  try {
    expect(host.textContent).toContain('Loading image');
    complete(host.querySelector('img')!); await nextTick();
    expect(host.querySelector('button')?.getAttribute('aria-label')).toBe('Preview image');
    expect(host.querySelector('.qk-image__hint')?.textContent).toBe('Preview');
    host.querySelector('img')!.dispatchEvent(new Event('error')); await nextTick();
    expect(host.textContent).toContain('Image failed to load');
    expect(host.textContent).toContain('Reload');
    expect(host.textContent).not.toMatch(/[\p{Script=Han}]/u);
  } finally { app.unmount(); pending.mockRestore(); }
});
