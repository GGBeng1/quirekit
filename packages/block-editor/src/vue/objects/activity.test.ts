// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref } from "vue";
import { createBlockEditor } from "../../runtime/create";
import { useBlockObjectTools } from "./activity";
import type { RichContentSurface } from "../../rich-content/types";

it("measures only the entered object and releases activity on permission changes and unmount", async () => {
  const instance = createBlockEditor({ content: "<p>正文</p>" });
  const enabled = ref(true);
  const sources = Array.from({ length: 100 }, () => {
    const root = document.createElement("section"); root.dataset.qkRich = "blockAsset"; document.body.append(root);
    const read = vi.spyOn(root, "getBoundingClientRect");
    let activity!: ReturnType<typeof useBlockObjectTools>;
    const app = createApp({ setup() {
      activity = useBlockObjectTools({ dom: root, editor: instance.editor } as RichContentSurface, enabled, ref(false));
      return () => h("span", "音频");
    } });
    app.mount(root); return { root, app, read, get activity() { return activity; } };
  });
  try {
    await nextTick(); expect(sources.every(source => source.read.mock.calls.length === 0)).toBe(true);
    sources[0]!.root.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    await nextTick(); expect(sources[0]!.activity.visible.value).toBe(true);
    expect(sources[0]!.read).toHaveBeenCalledTimes(1);
    expect(sources.slice(1).every(source => source.read.mock.calls.length === 0)).toBe(true);
    sources[99]!.root.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await nextTick(); expect(sources[0]!.activity.visible.value).toBe(false);
    expect(sources[99]!.activity.visible.value).toBe(true);
    expect(sources[99]!.read).toHaveBeenCalledTimes(1);
    expect(sources.slice(1, 99).every(source => source.read.mock.calls.length === 0)).toBe(true);
    enabled.value = false; await nextTick(); expect(sources[99]!.activity.visible.value).toBe(false);
    sources[0]!.root.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    await nextTick(); expect(sources[0]!.activity.visible.value).toBe(false);
    enabled.value = true; await nextTick();
  } finally {
    for (const source of sources) source.app.unmount();
    sources[99]!.root.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    expect(sources[99]!.activity.visible.value).toBe(false);
    for (const source of sources) source.root.remove();
    instance.destroy();
  }
});
