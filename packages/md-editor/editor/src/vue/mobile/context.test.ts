// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { useMobileTaskContext } from "./context";
afterEach(() => vi.restoreAllMocks());

it("reveals an occluded endpoint once, coalesces shell changes and does no hidden source work", async () => {
  const shell = document.createElement("div"), child = document.createElement("span"), host = document.createElement("div");
  shell.append(child); document.body.append(shell, host);
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  const surface = shallowRef<HTMLElement | null>(null), state = shallowRef(EditorState.create({ doc: "x".repeat(10_000), selection: { anchor: 5 } }));
  let caretTop = 520;
  const bounds = vi.spyOn(shell, "getBoundingClientRect").mockReturnValue({ top: 350, bottom: 667, left: 0, right: 375, height: 317 } as DOMRect);
  const coords = vi.fn(() => ({ top: caretTop, bottom: caretTop + 24, left: 40, right: 40 }));
  const view = { visibleRanges: [{ from: 0, to: 20 }], composing: false, coordsAtPos: coords };
  vi.spyOn(EditorView, "findFromDOM").mockReturnValue(view as unknown as EditorView);
  const serialize = vi.fn(), select = vi.fn(), scroll = vi.fn(() => { caretTop = 100; });
  const owner = { element: host, documentScope: {}, mode: "live", get state() { return state.value; }, scrollTo: scroll, getMarkdown: serialize, setSelection: select } as unknown as MsfeEditor;
  const app = createApp({ setup() { useMobileTaskContext(shallowRef(owner), state, surface, shallowRef(host), shallowRef(true)); return () => h("span"); } }); app.mount(host);
  try {
    for (let i = 0; i < 100; i++) state.value = state.value.update({ changes: { from: state.value.doc.length, insert: "x" } }).state;
    await nextTick(); expect(bounds).not.toHaveBeenCalled(); expect(coords).not.toHaveBeenCalled();
    surface.value = shell; await vi.waitFor(() => expect(scroll).toHaveBeenCalledExactlyOnceWith(5));
    expect(host.style.getPropertyValue("--md-editor-task-height")).not.toBe("");
    bounds.mockClear(); coords.mockClear();
    for (let i = 0; i < 100; i++) child.dispatchEvent(new Event("animationend", { bubbles: true }));
    await new Promise(resolve => window.requestAnimationFrame(resolve)); expect(bounds).not.toHaveBeenCalled();
    for (let i = 0; i < 5; i++) shell.dispatchEvent(new Event("transitionend"));
    await vi.waitFor(() => expect(bounds).toHaveBeenCalledOnce()); expect(coords).toHaveBeenCalledOnce(); expect(scroll).toHaveBeenCalledOnce();
    bounds.mockClear(); coords.mockClear(); view.composing = true; shell.dispatchEvent(new Event("animationend"));
    await new Promise(resolve => window.requestAnimationFrame(resolve)); expect(bounds).not.toHaveBeenCalled(); expect(coords).not.toHaveBeenCalled();
    view.composing = false; state.value = state.value.update({ selection: { anchor: state.value.doc.length } }).state;
    await new Promise(resolve => window.requestAnimationFrame(resolve)); expect(bounds).not.toHaveBeenCalled();
    surface.value = null; await nextTick(); bounds.mockClear(); coords.mockClear();
    expect(host.style.getPropertyValue("--md-editor-task-height")).toBe("");
    shell.dispatchEvent(new Event("animationend")); state.value = state.value.update({ selection: { anchor: 5 } }).state;
    await new Promise(resolve => window.requestAnimationFrame(resolve)); expect(bounds).not.toHaveBeenCalled(); expect(coords).not.toHaveBeenCalled();
    expect(serialize).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled();
  } finally { app.unmount(); shell.remove(); host.remove(); }
});
