// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitToolbarEntry } from "../../../components/toolbar/types";
import { useToolbarCollapse } from "./use-collapse";

const cleanup: Array<() => void> = [];
afterEach(() => { cleanup.splice(0).forEach(dispose => dispose()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("ignores 100 state-only updates and coalesces resize while retaining an active split", async () => {
  let width = 320, resize: () => void = () => {}, reads = 0;
  class Observer {
    /** @param callback - Browser resize notification. */
    constructor(callback: () => void) { resize = callback; }
    /** @param _element - Current size owner. */ observe(_element: Element): void {}
    /** @param _element - Retired control. */ unobserve(_element: Element): void {}
    /** Releases every current control. */ disconnect(): void {}
  }
  vi.stubGlobal("ResizeObserver", Observer);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => width);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    reads++; const index = Number(this.dataset.qkToolbarUnit ?? 6); return new DOMRect(index * 50, 0, 44, 44);
  });
  const items = shallowRef<readonly QuireKitToolbarEntry[]>(Array.from({ length: 6 }, (_, i) => ({ value: String(i), label: `Tool ${i}`, icon: "copy" })));
  const paused = shallowRef(false), root = shallowRef<HTMLElement | null>(null);
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ setup() {
    const collapse = useToolbarCollapse({ root, enabled: () => true, items: () => items.value, paused: () => paused.value });
    return () => h('div', { ref: root, role: 'toolbar', style: { paddingInlineStart: '0px', paddingInlineEnd: '0px', columnGap: '6px' } }, [
      ...collapse.visible.value.map(item => h('span', { key: item.value, 'data-qk-toolbar-unit': item.value }, h('button', { 'aria-pressed': item.pressed }, item.label))),
      ...(collapse.collapsed.value.length ? [h('span', { 'data-qk-toolbar-more': '' }, h('button', 'More'))] : []),
    ]);
  } });
  app.mount(host); cleanup.push(() => { app.unmount(); host.remove(); }); await nextTick();
  expect(host.querySelector('[data-qk-toolbar-more]')).toBeNull(); reads = 0;
  for (let i = 0; i < 100; i++) { items.value = items.value.map(item => ({ ...item, pressed: i % 2 === 0, disabled: i % 2 !== 0, payload: i })); await nextTick(); }
  expect(reads).toBe(0);
  width = 200; for (let i = 0; i < 5; i++) resize();
  await new Promise(resolve => requestAnimationFrame(resolve)); await nextTick();
  expect(host.querySelectorAll('[data-qk-toolbar-unit]')).toHaveLength(3); expect(host.querySelector('[data-qk-toolbar-more]')).not.toBeNull();
  expect(reads).toBeLessThanOrEqual(12);
  paused.value = true; width = 500; resize();
  await new Promise(resolve => requestAnimationFrame(resolve)); await nextTick();
  expect(host.querySelectorAll('[data-qk-toolbar-unit]')).toHaveLength(3);
  paused.value = false; await nextTick();
  expect(host.querySelectorAll('[data-qk-toolbar-unit]')).toHaveLength(6); expect(host.querySelector('[data-qk-toolbar-more]')).toBeNull();
});
