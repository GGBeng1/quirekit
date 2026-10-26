// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, ref } from 'vue';
import type { VNode } from 'vue';
import QuireDiffViewer from './diff-viewer.vue';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';
import { parseDiffForViewer } from './parse';

const patch = 'diff --git a/plan.ts b/plan.ts\n--- a/plan.ts\n+++ b/plan.ts\n@@ -8,3 +8,4 @@\n const title = "计划";\n-old();\n+prepare();\n+run();\n keep();\n';
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

it('verifies separate old/new counters and preserves metadata ordering', () => {
  const result = parseDiffForViewer(patch, 1000);
  expect(result.kind).toBe('diff');
  if (result.kind !== 'diff') return;
  expect(result.segments[0]?.kind).toBe('metadata');
  const segment = result.segments[1];
  expect(segment?.kind).toBe('hunk');
  if (segment?.kind !== 'hunk') return;
  expect(segment.hunk.rows.map(row => [row.kind, row.oldNumber, row.newNumber])).toEqual([
    ['context', 8, 8], ['removed', 9, null], ['added', null, 9], ['added', null, 10], ['context', 10, 11]
  ]);
  expect([result.additions, result.removals]).toEqual([2, 1]);
});

it('falls back for malformed or oversized patch rather than presenting false line numbers', () => {
  expect(parseDiffForViewer('@@ -1,2 +1,1 @@\n-old\n+new\n', 100).kind).toBe('invalid');
  expect(parseDiffForViewer('@@ nonsense\n-old\n', 100).kind).toBe('invalid');
  expect(parseDiffForViewer(patch, 10).kind).toBe('large');
});

it('collapses each hunk, reveals hidden middle lines and copies the entire patch', async () => {
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const host = mount(() => h(QuireDiffViewer, { patch, maxVisibleLines: 2 }));
  expect(host.querySelectorAll('.qk-diff-viewer__line').length).toBe(2);
  host.querySelector<HTMLButtonElement>('.qk-diff-viewer__reveal')!.click();
  await nextTick();
  expect(host.querySelectorAll('.qk-diff-viewer__line').length).toBe(5);
  host.querySelector<HTMLButtonElement>('.qk-diff-viewer__hunk-toggle')!.click();
  await nextTick();
  expect(host.querySelectorAll('.qk-diff-viewer__line').length).toBe(0);
  host.querySelector<HTMLButtonElement>('[aria-label="复制完整补丁"]')!.click();
  await vi.waitFor(() => expect(write).toHaveBeenCalledWith(patch));
});

it('uses CodeBlock for raw source and resets preview when patch changes', async () => {
  const source = ref('@@ broken\n');
  const host = mount(() => h(QuireDiffViewer, { patch: source.value, maxStructuredCharacters: 20 }));
  expect(host.querySelector('pre')!.textContent).toBe(source.value);
  source.value = patch;
  await nextTick();
  expect(host.querySelector('pre')!.textContent).toContain('…');
  host.querySelector<HTMLButtonElement>('.qk-diff-viewer__expand-source')!.click();
  await nextTick();
  expect(host.querySelector('pre')!.textContent).toBe(patch);
});

it('keeps very long changed lines readable and copies the complete original patch', async () => {
  const removed = 'old'.repeat(700);
  const added = 'new'.repeat(700);
  const longPatch = `--- a/long.txt\n+++ b/long.txt\n@@ -1 +1 @@\n-${removed}\n+${added}\n`;
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const host = mount(() => h(QuireDiffViewer, { patch: longPatch, maxStructuredCharacters: 5000 }));
  expect(host.querySelectorAll('.qk-diff-viewer__line')).toHaveLength(2);
  expect(host.querySelector('.qk-diff-viewer__line[data-kind="removed"] .qk-diff-viewer__text')?.textContent).toBe(removed);
  expect(host.querySelector('.qk-diff-viewer__line[data-kind="added"] .qk-diff-viewer__text')?.textContent).toBe(added);
  host.querySelector<HTMLButtonElement>('[aria-label="复制完整补丁"]')!.click();
  await vi.waitFor(() => expect(write).toHaveBeenCalledWith(longPatch));
});

it('reads view, hunk and line text from the active language', async () => {
  const plain = patch.replace('"计划"', '"plan"');
  const host = mount(() => h(QuireLocaleProvider, { locale: 'en' }, () => h(QuireDiffViewer, { patch: plain, maxVisibleLines: 2 })));
  expect(host.querySelector('section')!.getAttribute('aria-label')).toBe('Code diff');
  expect(host.textContent).toContain('Diff');
  expect(host.querySelector('.qk-diff-viewer__hunk')!.getAttribute('aria-label')).toMatch(/^Hunk \d+$/u);
  expect(host.querySelector('.qk-diff-viewer__reveal')!.textContent?.trim()).toMatch(/^Show \d+ lines? (above|below)$/u);
  expect(host.querySelector('[data-kind="added"] .qk-diff-viewer__marker, [data-kind="removed"] .qk-diff-viewer__marker')!.getAttribute('aria-label')).toMatch(/^(Added|Removed) line$/u);
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
  const invalid = mount(() => h(QuireLocaleProvider, { locale: 'en' }, () => h(QuireDiffViewer, { patch: 'not a diff' })));
  expect(invalid.textContent).toContain('Not a valid unified diff, showing source');
  expect(invalid.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});
