import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext } from "../../types";
import type { QuireMountedCaretRect } from "@quirekit/core";
import { createClassicMobileSelection } from "./selection";

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).reverse().forEach(cleanup => cleanup()); vi.restoreAllMocks(); });

/** @returns A controlled acceptance/geometry lifecycle with real public handle DOM. */
function mountSelection() {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 1;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
  const root = document.createElement("div");
  const workspaceViewport = document.createElement("div");
  const documentOverlayHost = document.createElement("div");
  workspaceViewport.append(documentOverlayHost);
  root.append(workspaceViewport);
  document.body.append(root);
  vi.spyOn(workspaceViewport, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 440, 800));
  const events = new Map<string, Set<() => void>>();
  const geometry = new Set<() => void>();
  const selection = { anchor: 2, head: 2, empty: true, toJSON: () => ({ type: "text" }) };
  const state = { doc: {}, pm: { selection } };
  let rect = { left: 30, right: 30, top: 40, bottom: 60 };
  const coordsAtPos = vi.fn(() => rect);
  const editor = {
    state, isFocused: false, isEditable: true,
    view: { coordsAtPos, getCaretRect: undefined as (() => QuireMountedCaretRect | null) | undefined,
      onGeometryUpdate: (callback: () => void) => {
      geometry.add(callback);
      return () => { geometry.delete(callback); };
    } },
    on: (event: string, callback: () => void) => {
      if (!events.has(event)) events.set(event, new Set());
      events.get(event)!.add(callback);
    },
    off: (event: string, callback: () => void) => { events.get(event)?.delete(callback); }
  };
  const destroy = createClassicMobileSelection({ editor, ownerDocument: document, locale: "zh-CN" } as unknown as ClassicEditorRenderContext,
    { root, workspaceViewport, documentOverlayHost });
  cleanups.push(() => { destroy(); root.remove(); });
  const caret = root.querySelector<HTMLElement>('[data-handle="caret"]')!;
  /** Runs only callbacks already queued for this browser frame. */
  function flush(): void {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(0));
  }
  /** @param event - Accepted editor state event, independent of layout completion. */
  function emit(event: string): void { events.get(event)?.forEach(callback => callback()); }
  /** Publishes the current layout without another transaction or scroll. */
  function publish(): void {
    rect = { left: 120, right: 120, top: 80, bottom: 110 };
    geometry.forEach(callback => callback());
  }
  flush();
  coordsAtPos.mockClear();
  return { root, state, editor, caret, coordsAtPos, frames, geometry, events, flush, emit, publish, destroy, workspaceViewport };
}

describe("mobile selection presentation", () => {
  it.each([
    { focused: true, empty: true, mode: "input" },
    { focused: false, empty: true, mode: "touch" },
    { focused: true, empty: false, mode: "touch" },
    { focused: false, empty: false, mode: "touch" }
  ])("shows $mode for focused=$focused, collapsed=$empty", ({ focused, empty, mode }) => {
    const f = mountSelection();
    f.editor.isFocused = focused;
    Object.assign(f.state.pm.selection, { empty, head: empty ? 2 : 5 });
    f.emit("selectionUpdate");
    f.flush();
    expect(f.root.dataset.mobileCaret).toBe(mode);
    expect(f.caret.hidden).toBe(focused || !empty);
    for (const handle of ["anchor", "focus"]) {
      expect(f.root.querySelector<HTMLElement>(`[data-handle="${handle}"]`)!.hidden).toBe(empty);
    }
    expect(f.coordsAtPos).toHaveBeenCalledTimes(empty ? focused ? 0 : 1 : 2);
  });

  it("switches a collapsed caret on focus and blur without changing selection", () => {
    const f = mountSelection();
    expect(f.caret.hidden).toBe(false);
    f.editor.isFocused = true;
    f.emit("focus");
    f.flush();
    expect(f.caret.hidden).toBe(true);
    expect(f.root.dataset.mobileCaret).toBe("input");
    f.editor.isFocused = false;
    f.emit("blur");
    f.flush();
    expect(f.caret.hidden).toBe(false);
    expect(f.root.dataset.mobileCaret).toBe("touch");
    expect(f.state.pm.selection).toMatchObject({ anchor: 2, head: 2, empty: true });
    f.destroy();
    expect(f.root.hasAttribute("data-mobile-caret")).toBe(false);
  });

  it("uses the presented preedit caret even while canonical selection is a replacement range", () => {
    const f = mountSelection();
    f.editor.isFocused = true;
    const selection = f.state.pm.selection;
    selection.head = 5;
    selection.empty = false;
    f.editor.view.getCaretRect = vi.fn(() => ({ left: 180, right: 181, top: 90, bottom: 125 }));
    f.publish();
    expect(f.caret.style.left).toBe("180px");
    expect(f.caret.style.top).toBe("90px");
    expect(f.caret.style.height).toBe("35px");
    expect(selection).toMatchObject({ anchor: 2, head: 5, empty: false });
    expect(f.coordsAtPos).not.toHaveBeenCalled();
    expect(f.frames.size).toBe(0);
  });

  it("hides an unavailable presented caret without guessing from canonical selection", () => {
    const f = mountSelection();
    f.editor.view.getCaretRect = vi.fn(() => null);
    f.publish();
    expect(f.caret.hidden).toBe(true);
    expect(f.coordsAtPos).not.toHaveBeenCalled();
  });

  it("never queries an older layout with newly accepted document positions", () => {
    const f = mountSelection();
    f.state.doc = {};
    f.state.pm.selection.head = f.state.pm.selection.anchor = 9;
    f.emit("transaction");
    f.emit("selectionUpdate");
    f.flush();
    expect(f.coordsAtPos).not.toHaveBeenCalled();
    f.publish();
    f.flush();
    expect(f.caret.style.left).toBe("120px");
    expect(f.caret.style.top).toBe("80px");
    expect(f.coordsAtPos).toHaveBeenCalledTimes(1);
  });

  it("refreshes geometry-only changes and releases its subscription and queued work", () => {
    const f = mountSelection();
    for (let index = 0; index < 100; index++) {
      f.emit("selectionUpdate");
      f.workspaceViewport.dispatchEvent(new Event("scroll"));
    }
    expect(f.frames.size).toBe(1);
    f.publish();
    f.flush();
    expect(f.caret.style.left).toBe("120px");
    expect(f.coordsAtPos).toHaveBeenCalledTimes(1);
    f.coordsAtPos.mockClear();
    f.publish();
    f.flush();
    expect(f.coordsAtPos).toHaveBeenCalledTimes(1);
    f.emit("selectionUpdate");
    f.destroy();
    expect(f.geometry.size).toBe(0);
    expect(f.frames.size).toBe(0);
    expect([...f.events.values()].every(listeners => listeners.size === 0)).toBe(true);
  });
});
