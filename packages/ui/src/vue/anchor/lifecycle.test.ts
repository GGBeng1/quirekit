// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from 'vue';
import type { VNode } from 'vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QuireAnchor } from './index';
import { resolveAnchorContainer } from './dom';

const cleanup: Array<() => void> = [];
beforeEach(() => {
  vi.spyOn(document, 'scrollingElement', 'get').mockReturnValue(document.documentElement);
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
    return this.hidden ? [] as unknown as DOMRectList : [this.getBoundingClientRect()] as unknown as DOMRectList;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 240, 160, 32));
});
afterEach(() => { cleanup.splice(0).forEach(dispose => dispose()); vi.restoreAllMocks(); });

/** @param render - Consumer tree. @returns The native host and explicit unmount operation. */
function mount(render: () => VNode) {
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render }); app.mount(host);
  let mounted = true;
  /** Removes the component and its consumer DOM exactly once. */
  function unmount(): void { if (mounted) { mounted = false; app.unmount(); host.remove(); } }
  cleanup.push(unmount);
  return { host, unmount };
}

it('uses the window scroller by default and leaves explicitly missing owners unresolved', () => {
  expect(resolveAnchorContainer(undefined)).toBe(document.documentElement);
  expect(resolveAnchorContainer('#not-mounted')).toBeNull();
  const scroll = vi.spyOn(document.documentElement, 'scrollTo');
  const { host } = mount(() => h('div', [h(QuireAnchor, { items: [{ id: 'default-heading', label: 'Heading' }], history: false }), h('h2', { id: 'default-heading' }, 'Heading')]));
  host.querySelector('a')!.click();
  expect(scroll).toHaveBeenCalledWith({ top: 224, behavior: 'smooth' });
  expect(document.activeElement?.id).toBe('default-heading');
});

it('binds a late ref-backed owner and removes observers, listeners and temporary focus on unmount', async () => {
  const owner = shallowRef<HTMLElement | null>(null);
  const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect');
  const { host, unmount } = mount(() => h('div', [
    h(QuireAnchor, { items: [{ id: 'late-heading', label: 'Late' }], scrollContainer: () => owner.value, history: false }),
    h('section', { 'data-owner': '' }, [h('h2', { id: 'late-heading' }, 'Late')])
  ]));
  const element = host.querySelector<HTMLElement>('[data-owner]')!;
  const scroll = vi.spyOn(element, 'scrollTo');
  const remove = vi.spyOn(element, 'removeEventListener');
  owner.value = element; await nextTick();
  host.querySelector('a')!.click();
  expect(scroll).toHaveBeenCalledOnce();
  expect(host.querySelector('h2')?.getAttribute('tabindex')).toBe('-1');
  const heading = host.querySelector('h2')!;
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
  expect(remove.mock.calls.some(call => call[0] === 'scroll')).toBe(true);
  expect(heading.hasAttribute('tabindex')).toBe(false);
});

it('does not intercept cancelled or modified navigation and preserves existing target tabindex', () => {
  const scroll = vi.spyOn(document.documentElement, 'scrollTo');
  const cancel = vi.fn((_item, event: MouseEvent) => event.preventDefault());
  const { host } = mount(() => h('div', [
    h(QuireAnchor, { items: [{ id: 'existing-focus', label: 'Cancel' }], onNavigate: cancel, history: false }),
    h(QuireAnchor, { items: [{ id: 'existing-focus', label: 'Follow' }], history: false }),
    h('h2', { id: 'existing-focus', tabindex: '0' }, 'Heading')
  ]));
  host.querySelector('a')!.click();
  expect(cancel).toHaveBeenCalledOnce(); expect(scroll).not.toHaveBeenCalled();
  host.querySelectorAll('a')[1]!.dispatchEvent(new MouseEvent('click', { ctrlKey: true, bubbles: true, cancelable: true }));
  expect(scroll).not.toHaveBeenCalled();
  host.querySelectorAll('a')[1]!.click();
  expect(scroll).toHaveBeenCalledOnce();
  expect(host.querySelector('h2')!.getAttribute('tabindex')).toBe('0');
});
