// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import Splitter from "./splitter.vue";
import type { QuireKitSplitterHandleVariant } from "../../components/splitter";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts two named panes with observable controlled sizes.
 * @param orientation - Direction in which the panes are arranged.
 * @param handleVariant - Visual treatment, independent of resize semantics.
 * @returns The rendered host and reactive public props.
 */
async function mountSplitter(orientation: "horizontal" | "vertical", handleVariant: QuireKitSplitterHandleVariant) {
  // Happy DOM has no layout engine; give both axes a real-sized group rectangle.
  const measure = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockReturnValue(new DOMRect(0, 0, 400, 400));
  cleanups.push(() => measure.mockRestore());
  const state = reactive({ size: [40, 60], disabled: false });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({
    setup: () => () => h(Splitter, {
      label: "工作区", orientation, handleVariant, keyboardResizeBy: 5,
      panels: [{ id: "document", label: "文档", minSize: 20 }, { id: "inspector", label: "检查器", minSize: 20 }],
      size: state.size, disabled: state.disabled,
      "onUpdate:size": (value: number[] | undefined) => { if (value) state.size = value; }
    })
  }));
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return { host, state };
}

describe("Splitter separator semantics and keyboard resizing", () => {
  it.each([
    ["horizontal", "vertical", "ArrowRight", "ArrowDown", "line"],
    ["vertical", "horizontal", "ArrowDown", "ArrowRight", "line"],
    ["horizontal", "vertical", "ArrowRight", "ArrowDown", "hover-bar"],
    ["vertical", "horizontal", "ArrowDown", "ArrowRight", "hover-bar"]
  ] as const)("names the %s panes' separator and preserves the resize axis (%s, %s, %s, %s)", async (orientation, separatorOrientation, resizeKey, otherKey, variant) => {
    const { host, state } = await mountSplitter(orientation, variant);
    const handle = host.querySelector<HTMLElement>("[role=separator]")!;
    expect(handle.getAttribute("aria-label")).toBe("调整文档与检查器的空间");
    expect(handle.getAttribute("aria-orientation")).toBe(separatorOrientation);
    const controlledIds = handle.getAttribute("aria-controls")!.split(" ");
    expect(controlledIds).toHaveLength(2);
    expect(controlledIds.every(id => document.getElementById(id)?.getAttribute("data-part") === "panel")).toBe(true);
    handle.focus();
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: otherKey, bubbles: true, cancelable: true }));
    await nextTick();
    expect(state.size).toEqual([40, 60]);
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: resizeKey, bubbles: true, cancelable: true }));
    await nextTick();
    expect(state.size).toEqual([45, 55]);
    expect(handle.getAttribute("aria-valuenow")).toBe("45");
    state.disabled = true;
    await nextTick();
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: resizeKey, bubbles: true, cancelable: true }));
    await nextTick();
    expect(state.size).toEqual([45, 55]);
    expect(handle.tabIndex).toBe(-1);
  });
});
