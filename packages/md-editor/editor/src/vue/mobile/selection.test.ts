// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorSelection, EditorState } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import type { MsfeEditor } from "@quirekit/msfe-core";
import SelectionActions from "./selection.vue";

const dispose: (() => void)[] = [];
afterEach(() => { for (const cleanup of dispose.splice(0)) cleanup(); vi.restoreAllMocks(); });

/** @returns A mounted action owner with explicit native focus, selection and embedded-control boundaries. */
function mountActions() {
  const element = document.createElement("div"), content = document.createElement("div"), paragraph = document.createElement("p");
  content.contentEditable = "true"; paragraph.textContent = "original paragraph"; content.append(paragraph); element.append(content); document.body.append(element);
  const state = shallowRef(EditorState.create({ doc: paragraph.textContent, selection: EditorSelection.single(0, 8) })), enabled = shallowRef(true);
  const view = { contentDOM: content, get state() { return state.value; }, hasFocus: true, composing: false, visibleRanges: [], coordsAtPos: vi.fn() };
  vi.spyOn(EditorView, "findFromDOM").mockReturnValue(view as unknown as EditorView);
  const serialize = vi.fn(), editor = { element, get state() { return state.value; }, mode: "live", getMarkdown: serialize } as unknown as MsfeEditor;
  const host = document.createElement("div"); document.body.append(host);
  const app = createApp({ render: () => h(SelectionActions, { editor, state: state.value, enabled: enabled.value, locale: "zh-CN" }) });
  app.mount(host);
  let mounted = true;
  /** Detach the listener once, including when the test explicitly releases ownership before cleanup. */
  function unmount(): void { if (mounted) { mounted = false; app.unmount(); } }
  dispose.push(() => { unmount(); host.remove(); element.remove(); });
  return { element, content, paragraph, state, enabled, view, serialize, unmount };
}

/** @param element - Original browser menu target. @returns Whether native default handling remains available. */
function contextMenu(element: Element): boolean {
  return element.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2 }));
}

describe("mobile selection context ownership", () => {
  it("cancels resting text selection menus without changing source or doing geometry work", () => {
    const f = mountActions(), original = f.state.value;
    for (let index = 0; index < 100; index++) expect(contextMenu(f.paragraph)).toBe(false);
    expect(f.state.value).toBe(original); expect(f.serialize).not.toHaveBeenCalled(); expect(f.view.coordsAtPos).not.toHaveBeenCalled();
    f.unmount(); expect(contextMenu(f.paragraph)).toBe(true);
  });

  it("yields disabled, collapsed, unfocused and composing selection ownership", async () => {
    const f = mountActions();
    f.enabled.value = false; await nextTick(); expect(contextMenu(f.paragraph)).toBe(true);
    f.enabled.value = true; await nextTick(); expect(contextMenu(f.paragraph)).toBe(false);
    f.state.value = f.state.value.update({ selection: EditorSelection.cursor(2) }).state;
    expect(contextMenu(f.paragraph)).toBe(true);
    f.state.value = f.state.value.update({ selection: EditorSelection.single(0, 8) }).state;
    f.view.hasFocus = false; expect(contextMenu(f.paragraph)).toBe(true);
    f.view.hasFocus = true; f.view.composing = true; expect(contextMenu(f.paragraph)).toBe(true);
  });

  it("leaves embedded controls and other editor roots to their own native menus", () => {
    const f = mountActions(), input = document.createElement("input"), widget = document.createElement("div"), text = document.createElement("p");
    widget.className = "msfe-component-view"; widget.append(text); f.content.append(input, widget);
    expect(contextMenu(input)).toBe(true); expect(contextMenu(text)).toBe(true);
    const outside = document.createElement("p"); document.body.append(outside);
    try { expect(contextMenu(outside)).toBe(true); } finally { outside.remove(); }
    expect(contextMenu(f.paragraph)).toBe(false);
  });
});
