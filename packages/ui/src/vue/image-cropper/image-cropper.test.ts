import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it } from 'vitest';
import QuireImageCropper from './image-cropper.vue';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';
describe('ImageCropper server rendering', () => {
  it('renders a named loading workspace without browser image or canvas access', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(QuireImageCropper, { src: '/photo.png', alt: '海岸' }) }));
    expect(html).toContain('aria-label="图片裁剪"');
    expect(html).toContain('正在加载图片');
    expect(html).toContain('role="status"');
    expect(html).not.toContain('<canvas');
  });
  it('takes text from the active language in a compact consumer without built-in toolbar', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(QuireLocaleProvider, { locale: 'en' }, () => h(QuireImageCropper, {
      src: '/photo.png', alt: 'Coast', toolbar: false, disabled: true
    })) }));
    expect(html).toContain('aria-label="Image crop"');
    expect(html).toContain('Loading image');
    expect(html).not.toMatch(/[\p{Script=Han}]/u);
    expect(html).toContain('data-disabled');
    expect(html).not.toContain('qk-image-cropper__toolbar');
  });
});
