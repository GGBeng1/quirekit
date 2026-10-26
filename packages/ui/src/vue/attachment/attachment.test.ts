// @vitest-environment happy-dom
import { createApp, createSSRApp, h, nextTick, reactive } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { expect, it, vi } from 'vitest';
import type { QuireKitAttachmentItem } from '../../components/attachment';
import type { QuireKitChatMessagePart } from '../../components/chat';
import Attachment from './attachment.vue';
import Attachments from './attachments.vue';
import Message from '../chat/message/message.vue';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';

it('shows real status and only emits intents, with no URL creation or host mutation', async () => {
  const item = reactive<QuireKitAttachmentItem>({ id: 'a', name: 'report.pdf', state: 'uploading', progress: 33, actions: ['open', 'download', 'retry', 'remove'] });
  const action = vi.fn(); const create = vi.spyOn(URL, 'createObjectURL');
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Attachment, { item, onAction: action }) }); app.mount(host);
  try {
    expect(host.textContent).toContain('33%');
    expect(host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('33');
    expect(host.querySelectorAll('button')).toHaveLength(1);
    host.querySelector('button')!.click();
    expect(action).toHaveBeenCalledWith({ attachmentId: 'a', action: 'remove' });
    expect(host.querySelector('[data-attachment-id="a"]')).not.toBeNull();
    Object.assign(item, { state: 'failed', statusText: '网络不可用' }); await nextTick();
    expect(host.textContent).toContain('网络不可用'); expect(host.querySelectorAll('button')).toHaveLength(2);
    host.querySelector('button')!.click();
    expect(action).toHaveBeenLastCalledWith({ attachmentId: 'a', action: 'retry' });
    Object.assign(item, { state: 'uploading', progress: NaN }); await nextTick();
    expect(host.querySelector('.qk-shimmer')).not.toBeNull();
    expect(host.querySelector('[role="progressbar"]')).toBeNull();
    expect(create).not.toHaveBeenCalled();
  } finally { app.unmount(); host.remove(); create.mockRestore(); }
});

it('preserves item nodes during updates and recovers only removal-induced focus loss', async () => {
  const items = reactive<QuireKitAttachmentItem[]>([{ id: 'a', name: 'a.txt', actions: ['remove'] }, { id: 'b', name: 'b.txt', actions: ['remove'] }]);
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Attachments, { items }) }); app.mount(host);
  try {
    const stable = host.querySelector('[data-attachment-id="b"]');
    Object.assign(items[0]!, { state: 'uploading', progress: 45 }); await nextTick();
    expect(host.querySelector('[data-attachment-id="b"]')).toBe(stable);
    host.querySelector<HTMLButtonElement>('button')!.focus();
    items.shift(); await nextTick(); await nextTick();
    expect(document.activeElement).toBe(stable?.querySelector('button'));
    items.splice(0); await nextTick(); await nextTick();
    expect(document.activeElement).toBe(host.querySelector('.qk-attachments'));
  } finally { app.unmount(); host.remove(); }
});

it('supports all four layouts in SSR and escapes host filenames', async () => {
  for (const layout of ['inline', 'list', 'grid', 'strip'] as const) {
    const html = await renderToString(createSSRApp({ render: () => h(Attachments, { layout, items: [{ id: 'a', name: '<script>file</script>' }] }) }));
    expect(html).toContain(`data-layout="${layout}"`);
    expect(html).toContain('&lt;script&gt;file&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('qk-image-preview__stage');
  }
});

it('forwards attachment intents through Message with message, part and attachment identities', async () => {
  const parts: QuireKitChatMessagePart[] = [{ id: 'files', kind: 'attachment', items: [{ id: 'a', name: 'a.txt', actions: ['download'] }] }];
  const attachmentAction = vi.fn(); const action = vi.fn();
  const host = document.createElement('div');
  const app = createApp({ render: () => h(Message, { author: '助手', messageId: 'm', parts, onAttachmentAction: attachmentAction, onAction: action }) }); app.mount(host);
  try {
    host.querySelector<HTMLButtonElement>('[aria-label="下载 a.txt"]')!.click(); await nextTick();
    expect(attachmentAction).toHaveBeenCalledWith({ attachmentId: 'a', action: 'download', messageId: 'm', partId: 'files' });
    expect(action).not.toHaveBeenCalled();
  } finally { app.unmount(); }
});

it('keeps two resources with the same URL distinct during active-preview removal', async () => {
  const pending = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
  const items = reactive<QuireKitAttachmentItem[]>([
    { id: 'a', name: 'first.svg', mediaType: 'image/svg+xml', url: '/same.svg', actions: ['remove'] },
    { id: 'b', name: 'second.svg', mediaType: 'image/svg+xml', url: '/same.svg', actions: ['remove'] }
  ]);
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Attachments, { items, onAction: details => items.splice(items.findIndex(item => item.id === details.attachmentId), 1) }) }); app.mount(host);
  try {
    for (const image of host.querySelectorAll('img')) {
      Object.defineProperties(image, { naturalWidth: { value: 40 }, naturalHeight: { value: 40 } });
      image.dispatchEvent(new Event('load'));
    }
    await nextTick();
    host.querySelector<HTMLButtonElement>('[aria-label="预览：second.svg"]')!.click();
    await vi.waitFor(() => expect(document.querySelector('.qk-image-preview')).not.toBeNull());
    document.querySelector<HTMLButtonElement>('.qk-image-preview [aria-label="移除 second.svg"]')!.click();
    await nextTick();
    expect(items.map(item => item.id)).toEqual(['a']);
    expect(document.querySelector('.qk-image-preview')?.textContent).toContain('first.svg');
    document.querySelector<HTMLButtonElement>('.qk-image-preview [aria-label="移除 first.svg"]')!.click();
    await vi.waitFor(() => expect(document.querySelector('.qk-image-preview')).toBeNull());
  } finally { app.unmount(); host.remove(); pending.mockRestore(); }
});

it('follows the global language for status and per-file action names', async () => {
  const items: QuireKitAttachmentItem[] = [
    { id: 'a', name: 'report.pdf', state: 'failed', actions: ['retry', 'remove'] },
    { id: 'b', name: 'draft.txt', state: 'uploading', progress: 40 }
  ];
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(QuireLocaleProvider, { locale: 'en' }, () => h(Attachments, { items })) }); app.mount(host);
  try {
    await nextTick();
    expect(host.querySelector('.qk-attachments')?.getAttribute('aria-label')).toBe('Attachments');
    expect(host.textContent).toContain('Upload failed');
    expect(host.textContent).toContain('Uploading');
    expect(host.querySelector('[data-action="retry"]')?.getAttribute('aria-label')).toBe('Retry report.pdf');
    expect(host.textContent).not.toMatch(/[\p{Script=Han}]/u);
  } finally { app.unmount(); host.remove(); }
});
