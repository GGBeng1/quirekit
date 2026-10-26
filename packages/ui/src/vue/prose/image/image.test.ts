// @vitest-environment happy-dom
import { createApp, h, nextTick } from 'vue';
import { expect, it, vi } from 'vitest';
import { QuireProse, QuireProseImage } from '../index';
import { QuireImage } from '../../image';

it('keeps paragraph structure and preview behavior, but leaves linked images to the outer navigation', async () => {
  const pending = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
  for (const linked of [false, true]) {
    const host = document.createElement('div'); document.body.append(host);
    const picture = () => h(QuireProseImage, { src: '/coast.svg', alt: '海岸', width: 640, height: 320 });
    const app = createApp({ render: () => h('p', {}, linked ? h('a', { href: '/guide' }, picture()) : picture()) });
    app.mount(host);
    try {
      await nextTick();
      const img = host.querySelector('img')!;
      Object.defineProperty(img, 'naturalWidth', { value: 640 });
      img.dispatchEvent(new Event('load')); await nextTick();
      expect(host.querySelector('p div')).toBeNull();
      expect(host.querySelectorAll('.qk-image__trigger')).toHaveLength(linked ? 0 : 1);
      if (linked) {
        img.dispatchEvent(new Event('error')); await nextTick();
        expect(host.querySelector('a button')).toBeNull();
        expect(host.querySelector('a')?.textContent).toContain('图片加载失败');
      }
    } finally { app.unmount(); host.remove(); }
  }
  pending.mockRestore();
});

it('groups article images while nested prose, embedded islands and ordinary Image stay separate', async () => {
  const pending = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
  const host = document.createElement('div'); document.body.append(host);
  const picture = (name: string) => h(QuireProseImage, { src: `/${name}.svg`, alt: name });
  const app = createApp({ render: () => h(QuireProse, {}, () => [
    h('p', {}, picture('first')),
    h('p', {}, picture('second')),
    h('div', { 'data-qk-not-prose': '' }, picture('island')),
    h(QuireProse, {}, () => picture('nested')),
    h(QuireImage, { src: '/ordinary.svg', alt: 'ordinary', preview: true })
  ]) });
  app.mount(host);
  try {
    await nextTick();
    for (const img of host.querySelectorAll('img')) {
      Object.defineProperty(img, 'naturalWidth', { value: 640 });
      img.dispatchEvent(new Event('load'));
    }
    await nextTick();
    for (const [name, count] of [['second', '2 / 2'], ['nested', '1 / 1'], ['island', '1 / 1'], ['ordinary', '1 / 1']]) {
      host.querySelector<HTMLButtonElement>(`[aria-label="预览：${name}"]`)!.click();
      await vi.waitFor(() => expect(document.querySelector('.qk-image-preview__count')?.textContent).toBe(count));
      expect(document.querySelectorAll('.qk-image-preview')).toHaveLength(1);
      document.querySelector<HTMLButtonElement>('[aria-label="关闭预览"]')!.click();
      await vi.waitFor(() => expect(document.querySelector('.qk-image-preview')).toBeNull());
    }
  } finally { app.unmount(); host.remove(); pending.mockRestore(); }
});
