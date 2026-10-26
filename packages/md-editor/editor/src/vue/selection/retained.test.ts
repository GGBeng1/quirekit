// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { useRetainedSelection } from "./retained";

const dispose: (() => void)[] = [];
afterEach(() => { for (const cleanup of dispose.splice(0)) cleanup(); vi.restoreAllMocks(); });
/** @returns Explicit native focus with fixed source metadata and geometry work spies. */
function mountHint() {
  const element = document.createElement("div"), content = document.createElement("div"), control = document.createElement("input");
  content.tabIndex = 0; element.append(content); document.body.append(element, control);
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  const view = { dom: element, contentDOM: content, get hasFocus() { return document.activeElement === content; }, composing: false, coordsAtPos: vi.fn(), requestMeasure: vi.fn() };
  vi.spyOn(EditorView, "findFromDOM").mockReturnValue(view as unknown as EditorView);
  const state = shallowRef<EditorState | undefined>(EditorState.create({ doc: "original" }));
  let lifetime = {}, mode = "live";
  const serialize = vi.fn(), select = vi.fn();
  const owner = { element, get documentScope() { return lifetime; }, get mode() { return mode; }, getMarkdown: serialize, setSelection: select } as unknown as MsfeEditor;
  const editor = shallowRef<MsfeEditor | undefined>(owner), host = document.createElement("div"); document.body.append(host);
  const app = createApp({ setup() { useRetainedSelection(editor, state); return () => h("span"); } }); app.mount(host);
  let mounted = true;
  /** Ends the visibility owner once. */
  function unmount(): void { if (mounted) { mounted = false; app.unmount(); } }
  dispose.push(() => { unmount(); host.remove(); element.remove(); control.remove(); });
  return { element, content, control, state, editor, view, serialize, select, unmount,
    /** Replaces the accepted source lifetime. */ replace(): void { lifetime = {}; state.value = EditorState.create({ doc: "new" }); },
    /** @param value - New mode accepted with immutable state metadata. */ setMode(value: string): void { mode = value; state.value = state.value!.update({}).state; } };
}
describe("passive native caret ownership", () => {
  it("requires genuine source focus, retains blur and performs zero extra editor work", async () => {
    const f = mountHint(); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(false);
    f.content.focus(); f.control.focus(); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(true);
    const paint = vi.spyOn(f.element, "toggleAttribute");
    for (let i = 0; i < 100; i++) { f.content.dispatchEvent(new FocusEvent("focusout")); f.state.value = f.state.value!.update({ changes: { from: 0, insert: "x" } }).state; }
    await nextTick(); expect(paint).not.toHaveBeenCalled(); expect(f.view.coordsAtPos).not.toHaveBeenCalled();
    expect(f.view.requestMeasure).not.toHaveBeenCalled(); expect(f.serialize).not.toHaveBeenCalled(); expect(f.select).not.toHaveBeenCalled();
    f.unmount(); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(false);
    f.content.focus(); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(false);
  });
  it("hides composition, disabled and inactive windows and clears replaced source intent", () => {
    const f = mountHint(); f.content.focus(); f.control.focus();
    f.content.dispatchEvent(new Event("compositionstart")); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(false);
    f.content.dispatchEvent(new Event("compositionend")); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(true);
    window.dispatchEvent(new Event("blur")); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(false);
    window.dispatchEvent(new Event("focus")); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(true);
    f.state.value = EditorState.create({ doc: "readonly", extensions: [EditorState.readOnly.of(true)] }); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(false);
    f.state.value = EditorState.create({ doc: "editable" }); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(true);
    f.setMode("locked"); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(false);
    f.setMode("live"); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(true);
    f.replace(); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(false);
    f.content.focus(); f.control.focus(); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(true);
    f.editor.value = undefined; expect(f.element.hasAttribute("data-md-retained-selection")).toBe(false);
  });
  it("keeps the isolated custom owner through keyboard/window blur without extra selection work", () => {
    const f = mountHint(); f.element.setAttribute("data-msfe-input-proxy", "");
    f.content.focus(); f.control.focus(); window.dispatchEvent(new Event("blur"));
    expect(f.element.hasAttribute("data-md-retained-selection")).toBe(true);
    expect(f.select).not.toHaveBeenCalled(); expect(f.view.coordsAtPos).not.toHaveBeenCalled();
    f.replace(); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(false);
  });
  it("yields the passive caret to embedded controls and restores it for external chrome", () => {
    const f = mountHint(), embedded = document.createElement("input"), surface = document.createElement("section");
    surface.contentEditable = "false"; surface.tabIndex = -1; surface.append(embedded); f.content.append(surface);
    f.content.focus(); embedded.focus();
    expect(f.element.hasAttribute("data-md-retained-selection")).toBe(false);
    surface.focus(); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(false);
    f.control.focus(); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(true);
    f.content.focus(); expect(f.element.hasAttribute("data-md-retained-selection")).toBe(true);
    expect(f.select).not.toHaveBeenCalled(); expect(f.view.coordsAtPos).not.toHaveBeenCalled();
    expect(f.view.requestMeasure).not.toHaveBeenCalled(); expect(f.serialize).not.toHaveBeenCalled();
  });
});
