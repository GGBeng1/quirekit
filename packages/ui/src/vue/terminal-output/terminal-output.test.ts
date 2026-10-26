// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, ref } from 'vue';
import type { VNode } from 'vue';
import type { QuireKitTerminalOutputChunk } from '../../components/terminal-output';
import QuireTerminalOutput from './terminal-output.vue';
import { parseTerminalOutput } from './parse';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.restoreAllMocks(); });

/** @param render - Reactive Vue render. @returns Disposable host element. */
function mount(render: () => VNode): HTMLElement {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  return host;
}

it('keeps split ANSI SGR sequences safe and distinguishes streams', () => {
  const parsed = parseTerminalOutput([
    { id: '1', stream: 'stdout', text: 'start\n\u001b[3' },
    { id: '2', stream: 'stdout', text: '2mgreen\u001b[0m\n' },
    { id: '3', stream: 'stderr', text: '\u001b]8;;javascript:bad\u0007error\u001b[2J\n' }
  ], 1000);
  expect(parsed.spans.map(span => span.text).join('')).toBe('start\ngreen\nerror\n');
  expect(parsed.spans.find(span => span.text === 'green')?.color).toBe('green');
  expect(parsed.spans.at(-1)?.stream).toBe('stderr');
  const extended = parseTerminalOutput([{ id: 'x', stream: 'stdout', text: '\u001b[38;5;32mplain' }], 1000);
  expect(extended.spans[0]?.color).toBeUndefined();
});

it('bounds display work while copying the complete raw output', async () => {
  const chunks = ref<QuireKitTerminalOutputChunk[]>([{ id: 'a', stream: 'stdout', text: 'a'.repeat(1500) }]);
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const host = mount(() => h(QuireTerminalOutput, { chunks: chunks.value, maxVisibleCharacters: 1024 }));
  expect(host.querySelector('.qk-terminal-output__clipped')).not.toBeNull();
  expect(host.querySelector('.qk-terminal-output__content')!.textContent!.length).toBeLessThan(1100);
  host.querySelector<HTMLButtonElement>('.qk-clipboard__trigger')!.click();
  await vi.waitFor(() => expect(write).toHaveBeenCalledWith('a'.repeat(1500)));
  chunks.value = [...chunks.value, { id: 'b', stream: 'stderr', text: '\nfailed' }];
  await nextTick();
  expect(host.querySelector('[data-stream="stderr"]')?.textContent).toBe('\nfailed');
});

it('offers readable raw fallback and disables copy when upstream output is incomplete', async () => {
  const host = mount(() => h(QuireTerminalOutput, {
    chunks: [{ id: 'a', stream: 'stdout', text: '\u001b[31merror\u001b[0m' }],
    state: 'failed', exitCode: 1, truncated: '上游仅返回最近 1 MB'
  }));
  expect(host.textContent).toContain('运行失败 · 退出码 1');
  expect(host.querySelector('.qk-clipboard__trigger')).toBeNull();
  host.querySelector<HTMLButtonElement>('.qk-terminal-output__tools button')!.click();
  await nextTick();
  expect(host.querySelector('.qk-code-block')?.textContent).toContain('\\x1b[31merror');
  expect(host.textContent).toContain('上游仅返回最近 1 MB');
});

it('follows the global language for status, actions and accessible names', () => {
  const host = mount(() => h(QuireLocaleProvider, { locale: 'en' }, () => h(QuireTerminalOutput, {
    chunks: [{ id: 'a', stream: 'stdout', text: 'partial\n' }], state: 'cancelled', exitCode: 130
  })));
  expect(host.textContent).toContain('Cancelled · Exit code 130');
  expect(host.querySelector('.qk-terminal-output')?.getAttribute('aria-label')).toBe('Terminal output');
  expect(host.querySelector('.qk-terminal-output__viewport')?.getAttribute('aria-label')).toBe('Terminal output content');
  expect(host.querySelector('pre')?.textContent).toContain('partial');
  expect(host.textContent).not.toMatch(/[\p{Script=Han}]/u);
});

it('keeps the host-provided output name in the default Chinese text', () => {
  const host = mount(() => h(QuireTerminalOutput, { chunks: [], state: 'succeeded', label: '构建日志' }));
  expect(host.textContent).toContain('已完成');
  expect(host.textContent).toContain('暂无输出');
  expect(host.querySelector('.qk-terminal-output__viewport')?.getAttribute('aria-label')).toBe('构建日志内容');
});
