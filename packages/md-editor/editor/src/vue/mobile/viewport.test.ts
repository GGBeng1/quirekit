// @vitest-environment happy-dom
import { createApp, h, nextTick, ref } from "vue";
import { expect, it, vi } from "vitest";
import { useMobileViewport } from "./viewport";

it("bounds geometry work to visible chrome and coalesces viewport events", async () => {
  const root = document.createElement("div"), bar = document.createElement("div"), active = ref(false);
  root.append(bar); document.body.append(root);
  const rootMeasure = vi.spyOn(root, "getBoundingClientRect"), barMeasure = vi.spyOn(bar, "getBoundingClientRect");
  const app = createApp({ setup() { useMobileViewport(ref(root), ref(bar), active); return () => h("span"); } });
  const host = document.createElement("div"); document.body.append(host); app.mount(host);
  try {
    await nextTick(); window.dispatchEvent(new Event("resize"));
    expect(rootMeasure).not.toHaveBeenCalled(); expect(barMeasure).not.toHaveBeenCalled();
    active.value = true; await nextTick(); expect(rootMeasure).toHaveBeenCalledOnce();
    rootMeasure.mockClear(); barMeasure.mockClear();
    for (let i = 0; i < 5; i++) window.dispatchEvent(new Event("resize"));
    await vi.waitFor(() => expect(rootMeasure).toHaveBeenCalledOnce()); expect(barMeasure).toHaveBeenCalledOnce();
    active.value = false; await nextTick(); rootMeasure.mockClear(); barMeasure.mockClear();
    window.dispatchEvent(new Event("resize")); await new Promise(resolve => window.requestAnimationFrame(resolve));
    expect(rootMeasure).not.toHaveBeenCalled(); expect(barMeasure).not.toHaveBeenCalled();
    expect(root.style.getPropertyValue("--md-editor-dock-height")).toBe("");
  } finally { app.unmount(); root.remove(); host.remove(); vi.restoreAllMocks(); }
});

it("anchors fixed chrome to the layout viewport when iOS innerHeight shrinks", async () => {
  const root = document.createElement("div"), bar = document.createElement("div");
  root.append(bar); document.body.append(root);
  vi.spyOn(root, "getBoundingClientRect").mockReturnValue({ left: 0, right: 393 } as DOMRect);
  vi.spyOn(bar, "getBoundingClientRect").mockReturnValue({ height: 56 } as DOMRect);
  vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(852);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(400);
  vi.stubGlobal("visualViewport", Object.assign(new EventTarget(), { offsetTop: 20, height: 380, offsetLeft: 0, width: 393 }));
  let projected: ReturnType<typeof useMobileViewport>;
  const active = ref(false);
  const app = createApp({ setup() { projected = useMobileViewport(ref(root), ref(bar), active); return () => h("span"); } });
  const host = document.createElement("div"); document.body.append(host); app.mount(host);
  try {
    active.value = true; await nextTick();
    expect(projected!.value.bottom).toBe("452px");
    expect(projected!.value["--md-dock-safe-area"]).toBe("0px");
    expect(root.style.getPropertyValue("--md-editor-dock-height")).toBe("508px");
  } finally { app.unmount(); root.remove(); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); }
});
