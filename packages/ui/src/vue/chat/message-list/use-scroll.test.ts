// @vitest-environment happy-dom
import { createApp, h, nextTick, ref } from 'vue';
import { expect, it, vi } from 'vitest';
import { useMessageListScroll } from './use-scroll';
import type { MessageListScrollController } from './types';

it('coalesces geometry work, resets sessions, and cancels observers and frames on unmount', async () => {
  let resize = (): void => {};
  const disconnect = vi.fn();
  const request = vi.spyOn(window, 'requestAnimationFrame');
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  const frames: FrameRequestCallback[] = [];
  request.mockImplementation(callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('ResizeObserver', class {
    /** Save the browser callback for controlled invalidation.
     * @param callback - Geometry invalidation callback.
     */
    constructor(callback: () => void) { resize = callback; }
    /** Observe is intentionally inert in the deterministic layout fixture. */
    observe(): void {}
    /** Release the mounted observation. */
    disconnect(): void { disconnect(); }
  });
  const viewport = document.createElement('div'); const host = document.createElement('div');
  Object.defineProperties(viewport, { scrollHeight: { value: 1000 }, clientHeight: { value: 200 } });
  const session = ref('a'); const changed = vi.fn(); let api!: MessageListScrollController;
  const keys = ref(['first']);
  const app = createApp({ setup() {
    api = useMessageListScroll({ viewport: () => viewport, content: ref(viewport), keys: () => keys.value, session: () => session.value, onFollowingChange: changed });
    return () => h('div');
  } });
  app.mount(host);
  try {
    for (let index = 0; index < 100; index++) resize();
    expect(request).toHaveBeenCalledTimes(1);
    frames[0]!(0); expect(viewport.scrollTop).toBe(1000);
    viewport.scrollTop = 300; api.onScroll(); expect(api.following.value).toBe(false);
    expect(changed).toHaveBeenCalledExactlyOnceWith(false);
    keys.value = []; await nextTick(); expect(api.following.value).toBe(true);
    api.onScroll(); expect(api.following.value).toBe(false);
    session.value = 'b'; await nextTick();
    expect(api.following.value).toBe(true); expect(request).toHaveBeenCalledTimes(2);
    expect(api.scrollToMessage('missing')).toBe(false);
  } finally {
    app.unmount();
    expect(disconnect).toHaveBeenCalledOnce(); expect(cancel).toHaveBeenCalledWith(2);
    vi.restoreAllMocks(); vi.unstubAllGlobals();
  }
});

it('does not recapture changed media geometry from the scroll event of its own correction', () => {
  let resize = (): void => {};
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('ResizeObserver', class {
    /** @param callback - Resize notification controlled by this fixture. */
    constructor(callback: () => void) { resize = callback; }
    /** No native observation in the deterministic geometry fixture. */
    observe(): void {}
    /** No retained resources in this fixture. */
    disconnect(): void {}
  });
  const viewport = document.createElement('div');
  const item = document.createElement('div');
  const host = document.createElement('div');
  Object.defineProperties(viewport, { scrollHeight: { value: 2000 }, clientHeight: { value: 200 } });
  vi.spyOn(viewport, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 300, 200));
  let mediaGrowth = 0;
  const measure = vi.spyOn(item, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 200 + mediaGrowth - viewport.scrollTop, 300, 100));
  let api!: MessageListScrollController;
  const app = createApp({ setup() {
    api = useMessageListScroll({ viewport: () => viewport, content: ref(viewport), keys: () => ['reading'], session: () => 'a', onFollowingChange: () => {} });
    return () => h('div');
  } });
  app.mount(host); api.nodes.set('reading', item);
  try {
    frames.shift()!(0);
    viewport.scrollTop = 200; api.onScroll();
    mediaGrowth = 60; resize(); frames.shift()!(0);
    expect(viewport.scrollTop).toBe(260);
    // The image can finish before the browser delivers the earlier correction's scroll event.
    mediaGrowth = 492;
    measure.mockClear(); api.onScroll();
    expect(measure).not.toHaveBeenCalled();
    resize(); frames.shift()!(0);
    expect(viewport.scrollTop).toBe(692);
    expect(item.getBoundingClientRect().top).toBe(0);
    // A real user movement that overtakes a pending correction still owns the new anchor.
    viewport.scrollTop = 650; api.onScroll();
    mediaGrowth += 30; resize(); frames.shift()!(0);
    expect(viewport.scrollTop).toBe(680);
    expect(item.getBoundingClientRect().top).toBe(42);
  } finally {
    app.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  }
});
