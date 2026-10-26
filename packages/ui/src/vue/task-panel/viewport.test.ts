// @vitest-environment happy-dom
import { createApp, h, nextTick, ref, watch } from "vue";
import { expect, it, vi } from "vitest";
import { useTaskPanelViewport } from "./viewport";

it("clamps a caller height to its owner viewport and releases hidden resize work", async () => {
  const trigger = document.createElement("button"), host = document.createElement("div"); document.body.append(trigger, host);
  const open = ref(false), limit = ref<string | undefined>("76dvh");
  let style!: ReturnType<typeof useTaskPanelViewport>;
  const app = createApp({ setup() { style = useTaskPanelViewport(ref(trigger), open, limit); return () => h("span"); } }); app.mount(host);
  const write = vi.fn();
  const stop = watch(style, write);
  try {
    window.dispatchEvent(new Event("resize")); await new Promise(resolve => window.requestAnimationFrame(resolve)); expect(write).not.toHaveBeenCalled();
    open.value = true; await nextTick(); expect(style.value.maxHeight).toContain("min(calc("); expect(style.value.maxHeight).toContain("76dvh");
    write.mockClear(); for (let i = 0; i < 5; i++) window.dispatchEvent(new Event("resize"));
    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce());
    limit.value = undefined; await nextTick(); expect(style.value.maxHeight).not.toContain("min(");
    open.value = false; await nextTick(); write.mockClear(); window.dispatchEvent(new Event("resize"));
    await new Promise(resolve => window.requestAnimationFrame(resolve)); expect(write).not.toHaveBeenCalled();
  } finally { stop(); app.unmount(); trigger.remove(); host.remove(); }
});
