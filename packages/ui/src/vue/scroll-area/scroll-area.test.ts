// @vitest-environment happy-dom
import { createApp, h, ref } from 'vue';
import { expect, it } from 'vitest';
import ScrollArea from './scroll-area.vue';

it('exposes the native viewport for measurement and releases it on unmount', () => {
  const area = ref<InstanceType<typeof ScrollArea>>();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(ScrollArea, { ref: area, label: '内容' }, () => '正文') });
  app.mount(host);
  const handle = area.value!;
  expect(handle.getViewportElement()).toBe(host.querySelector('.qk-scroll-area__viewport'));
  expect(handle.getViewportElement()?.getAttribute('tabindex')).toBe('0');
  app.unmount(); expect(handle.getViewportElement()).toBeNull(); host.remove();
});

it('syncs the thumb once per frame without re-rendering slot content or writing inherited variables', async () => {
  const observers: { callback: ResizeObserverCallback; targets: Element[] }[] = [];
  const NativeObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    private readonly entry: { callback: ResizeObserverCallback; targets: Element[] };
    constructor(callback: ResizeObserverCallback) { this.entry = { callback, targets: [] }; observers.push(this.entry); }
    observe(target: Element): void { this.entry.targets.push(target); }
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
  const frames: FrameRequestCallback[] = [];
  const nativeFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  let renders = 0;
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(ScrollArea, null, () => h({ render: () => { renders += 1; return h('p', '正文'); } })) });
  app.mount(host);
  const viewport = host.querySelector<HTMLElement>('.qk-scroll-area__viewport')!;
  const bar = host.querySelector<HTMLElement>('.qk-scroll-area__scrollbar--vertical')!;
  const thumb = bar.querySelector<HTMLElement>('.qk-scroll-area__thumb')!;
  Object.defineProperties(viewport, { scrollHeight: { value: 1000 }, clientHeight: { value: 200 } });
  const resize = observers[0]!;
  resize.callback([{ target: bar, contentRect: { height: 100, width: 8 }, borderBoxSize: [{ inlineSize: 8, blockSize: 100 }] } as unknown as ResizeObserverEntry], {} as ResizeObserver);
  const before = renders;
  for (const top of [100, 200, 400]) { viewport.scrollTop = top; viewport.dispatchEvent(new Event('scroll')); }
  expect(frames.length).toBe(1);
  frames.splice(0).forEach(run => run(0));
  expect(renders).toBe(before);
  expect(bar.hasAttribute('data-scrolling')).toBe(true);
  expect(bar.hasAttribute('data-overflow-y')).toBe(true);
  // 轨道 100、可视 200/1000 → 滑块 20；滚到 400/800 → 偏移 (100-20)*0.5 = 40。
  expect(thumb.style.height).toBe('20px');
  expect(thumb.style.transform).toBe('translate3d(0, 40px, 0)');
  for (const element of [host.querySelector<HTMLElement>('.qk-scroll-area')!, viewport]) expect(element.getAttribute('style') ?? '').not.toContain('--');
  app.unmount(); host.remove();
  globalThis.ResizeObserver = NativeObserver; globalThis.requestAnimationFrame = nativeFrame;
});
