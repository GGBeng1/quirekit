// @vitest-environment happy-dom
import { createApp, h, reactive } from 'vue';
import { expect, it, vi } from 'vitest';
import DialogRoot from '../dialog/root.vue';
import Preview from './image-preview.vue';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';

it('suspends a controlled preview under a hidden retained owner without rewriting the host model', async () => {
  const state = reactive({ owner: false }); const changed = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(DialogRoot, { open: state.owner }, () => h(Preview, {
    open: true, items: [], 'onUpdate:open': changed
  })) });
  app.mount(host);
  const visible = () => document.querySelector('.qk-image-preview[data-state="open"]');
  expect(visible()).toBeNull();
  state.owner = true; await vi.waitFor(() => expect(visible()).not.toBeNull());
  state.owner = false; await vi.waitFor(() => expect(visible()).toBeNull());
  state.owner = true; await vi.waitFor(() => expect(visible()).not.toBeNull());
  expect(changed).not.toHaveBeenCalled();
  app.unmount(); host.remove(); expect(visible()).toBeNull();
});

it('only displays explicit titles while keeping an accessible dialog name', async () => {
  const state = reactive<{ title?: string }>({});
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Preview, {
    open: true, items: [{ id: 'asset-91', src: '/fixture.svg', alt: 'asset-91-alt', ...state }]
  }) });
  app.mount(host);
  const title = () => document.querySelector('.qk-image-preview [data-part="title"]')!;
  try {
    await vi.waitFor(() => expect(title()).not.toBeNull());
    expect(title().classList.contains('sr-only')).toBe(true);
    expect(title().textContent).toBe('图片预览');
    expect(document.querySelector('.qk-image-preview')?.getAttribute('aria-labelledby')).toBe(title().id);
    state.title = '海岸晨光';
    await vi.waitFor(() => expect(title().textContent).toBe('海岸晨光'));
    expect(title().classList.contains('sr-only')).toBe(false);
    state.title = '  ';
    await vi.waitFor(() => expect(title().classList.contains('sr-only')).toBe(true));
  } finally { app.unmount(); host.remove(); }
});

it('takes the complete preview surface text from the active language', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(QuireLocaleProvider, { locale: 'en' }, () => h(Preview, {
    open: true,
    index: 1,
    toolbar: 'gallery',
    items: [
      { id: 'first', src: '/first.svg', alt: 'First alternative' },
      { id: 'second', src: '/second.svg', alt: 'Second alternative' }
    ]
  })) });
  app.mount(host);
  try {
    await vi.waitFor(() => expect(document.querySelector('.qk-image-preview')).not.toBeNull());
    const preview = document.querySelector<HTMLElement>('.qk-image-preview')!;
    expect(preview.querySelector('[data-part="title"]')?.textContent).toBe('Image preview');
    expect(preview.querySelector('.qk-image-preview__close')?.getAttribute('aria-label')).toBe('Close preview');
    expect(preview.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Image tools');
    expect(preview.querySelector('[aria-label="Current image"]')?.textContent).toBe('2 / 2');
    expect(preview.querySelector('[aria-label="Previous image"]')).not.toBeNull();
    expect(preview.querySelector('[aria-label="Next image"]')).not.toBeNull();
    expect(preview.querySelector('[aria-label="Rotate left"]')).not.toBeNull();
    expect(preview.querySelector('[aria-label="Rotate right"]')).not.toBeNull();
    expect(preview.querySelector('.qk-image-preview__stage [role="alert"]')?.textContent).toContain('Image failed to load');
    expect(preview.querySelector('.qk-image-preview__stage [role="alert"] button')?.textContent).toBe('Reload');
    expect(preview.querySelector('[aria-label="Image list"]')).not.toBeNull();
    expect(preview.querySelector('[aria-label="View image 2: Second alternative"]')).not.toBeNull();
    expect(preview.textContent).not.toMatch(/[\p{Script=Han}]/u);
  } finally { app.unmount(); host.remove(); }
});
