// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, ref } from 'vue';
import type { VNode } from 'vue';
import QuireJsonViewer from './json-viewer.vue';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';
import { parseJsonForViewer } from './parse';

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup());
  vi.restoreAllMocks();
});

/** Mounts a reactive viewer in a disposable native host. @param render - Vue render function. @returns Host element. */
function mount(render: () => VNode): HTMLElement {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  return host;
}

it('bounds parsing and preserves invalid input as raw text', () => {
  expect(parseJsonForViewer('{broken', 100).kind).toBe('invalid');
  expect(parseJsonForViewer('{"a":1}', 3).kind).toBe('large');
  expect(parseJsonForViewer('{"a":1}', 100)).toEqual({ kind: 'tree', value: { a: 1 } });
});

it('lazily expands branches, pages keys and copies the exact original source', async () => {
  const source = '{\r\n  "first": { "nested": true },\r\n  "second": "long value"\r\n}\r\n';
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const host = mount(() => h(QuireJsonViewer, { source, pageSize: 1, maxValueLength: 16 }));
  expect(host.querySelectorAll('.qk-json-viewer__node').length).toBe(2);
  expect(host.querySelector('.qk-json-viewer__tree')!.textContent).toContain('first');
  expect(host.querySelector('.qk-json-viewer__tree')!.textContent).not.toContain('second');
  host.querySelector<HTMLButtonElement>('.qk-json-viewer__more')!.click();
  await nextTick();
  expect(host.querySelector('.qk-json-viewer__tree')!.textContent).toContain('second');
  host.querySelector<HTMLButtonElement>('[aria-label="复制 JSON 原文"]')!.click();
  await vi.waitFor(() => expect(write).toHaveBeenCalledWith(source));
});

it('uses CodeBlock for invalid, oversized and controlled source views', async () => {
  const source = ref('{broken');
  const host = mount(() => h(QuireJsonViewer, { source: source.value, maxTreeCharacters: 12 }));
  expect(host.querySelector('pre')!.textContent).toBe('{broken');
  source.value = '{"valid":true}';
  await nextTick();
  expect(host.querySelector('pre')!.textContent).toContain('…');
  source.value = '{"ok":true}';
  await nextTick();
  expect(host.querySelector('.qk-json-viewer__tree')).not.toBeNull();
  const raw = mount(() => h(QuireJsonViewer, { source: '{"ok":true}', view: 'source' }));
  expect(raw.querySelector('pre')!.textContent).toBe('{"ok":true}');
});

it('bounds a long scalar and oversized fallback without changing the copied authority', async () => {
  const scalar = '中'.repeat(2048);
  const source = JSON.stringify({ note: scalar });
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const tree = mount(() => h(QuireJsonViewer, { source, maxValueLength: 32 }));
  expect(tree.querySelector('.qk-json-viewer__value')!.textContent!.length).toBeLessThan(40);
  tree.querySelector<HTMLButtonElement>('.qk-json-viewer__scalar .qk-json-viewer__more')!.click();
  await nextTick();
  expect(tree.querySelector('.qk-json-viewer__value')!.textContent).toContain(scalar);

  const fallback = mount(() => h(QuireJsonViewer, { source, maxTreeCharacters: 128 }));
  expect(fallback.querySelector('.qk-json-viewer__tree')).toBeNull();
  expect(fallback.querySelector('pre')!.textContent!.length).toBeLessThan(140);
  fallback.querySelector<HTMLButtonElement>('[aria-label="复制 JSON 原文"]')!.click();
  await vi.waitFor(() => expect(write).toHaveBeenCalledWith(source));
});

it('takes every interface string from the active language', async () => {
  const host = mount(() => h(QuireLocaleProvider, { locale: 'en-US' }, () => h(QuireJsonViewer, { source: '{"list":[1,2,3],"text":"a long scalar value"}', pageSize: 2, maxValueLength: 8 })));
  expect(host.textContent).toContain('Tree');
  expect(host.textContent).toContain('2 items');
  expect(host.querySelector('[aria-label="JSON data view"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="Copy JSON source"]')).not.toBeNull();
  host.querySelector<HTMLDetailsElement>('.qk-json-viewer__branch .qk-json-viewer__branch')!.open = true;
  host.querySelector('.qk-json-viewer__branch .qk-json-viewer__branch')!.dispatchEvent(new Event('toggle'));
  await nextTick();
  expect(host.textContent).toContain('3 items');
  expect(host.textContent).toContain('Show 1 more');
  expect(host.textContent).toContain('Expand');
  expect(host.textContent).not.toMatch(/[\p{Script=Han}]/u);
});
