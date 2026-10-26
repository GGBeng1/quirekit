// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, ref, shallowRef } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitToolbarMode } from "../../../components/toolbar/types";
import { useToolbarMobile } from "./mode";
const cleanup: Array<() => void> = [];
afterEach(() => { cleanup.splice(0).forEach(dispose => dispose()); vi.restoreAllMocks(); });

it("shares one owner media lease and releases it when auto mode is no longer used", async () => {
  let change: () => void = () => {};
  const media = { matches: false, addEventListener: vi.fn((_name: string, listener: () => void) => { change = listener; }), removeEventListener: vi.fn() };
  const query = vi.spyOn(window, "matchMedia").mockReturnValue(media as unknown as MediaQueryList);
  const mode = ref<QuireKitToolbarMode>('auto');
  const Consumer = defineComponent({ setup() {
    const root = shallowRef<HTMLElement | null>(null), mobile = useToolbarMobile(root, () => mode.value);
    return () => h('div', { ref: root, 'data-mobile': mobile.value });
  } });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h('div', [h(Consumer), h(Consumer)]) }); app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); }); await nextTick();
  expect(query).toHaveBeenCalledTimes(1); expect(media.addEventListener).toHaveBeenCalledTimes(1);
  expect(host.querySelectorAll('[data-mobile="true"]')).toHaveLength(2);
  media.matches = true; change(); await nextTick(); expect(host.querySelectorAll('[data-mobile="false"]')).toHaveLength(2);
  mode.value = 'mobile'; await nextTick(); expect(media.removeEventListener).toHaveBeenCalledTimes(1);
  expect(host.querySelectorAll('[data-mobile="true"]')).toHaveLength(2);
  mode.value = 'desktop'; await nextTick(); expect(query).toHaveBeenCalledTimes(1);
});
