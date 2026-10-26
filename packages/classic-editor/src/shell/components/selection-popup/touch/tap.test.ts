// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext } from "@classic/types";
import { bindSelectedTextTap } from "./tap";

const releases: Array<() => void> = [];
afterEach(() => { releases.splice(0).forEach(release => release()); document.body.replaceChildren(); });

/** @returns An isolated editor plane with bounded public hit geometry. */
function fixture() {
  const root = document.createElement("div");
  const plane = document.createElement("canvas");
  plane.dataset.qkView = "canvas";
  root.append(plane);
  document.body.append(root);
  const selection = { from: 2, to: 20, empty: false, toJSON: () => ({ type: "text" }) };
  const editor = { state: { doc: {}, pm: { selection } }, view: {
    posAtCoords: vi.fn(() => ({ pos: 10 })),
    getTextRangeRects: vi.fn(() => [{ x: 10, y: 20, width: 30, height: 20 }])
  } };
  const toggle = vi.fn();
  let visible = true;
  const release = bindSelectedTextTap({ root, editor: editor as unknown as ClassicEditorRenderContext["editor"],
    isVisible: () => visible, toggle });
  releases.push(release);
  /** @param type - Native pointer phase. @param init - Overrides for cancellation cases. @returns Dispatched event. */
  function pointer(type: string, init: PointerEventInit = {}): PointerEvent {
    const event = new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: "touch", isPrimary: true,
      pointerId: 1, button: 0, clientX: 20, clientY: 30, ...init });
    plane.dispatchEvent(event);
    return event;
  }
  return { editor, toggle, root, plane, pointer, release, hide: () => { visible = false; } };
}

describe("selected-text touch tap", () => {
  it("captures visibility before outside-dismiss, preserves the range, and consumes only the accepted release", () => {
    const f = fixture();
    const before = f.editor.state.pm.selection;
    expect(f.pointer("pointerdown").defaultPrevented).toBe(false);
    f.hide();
    expect(f.pointer("pointerup").defaultPrevented).toBe(true);
    expect(f.toggle).toHaveBeenCalledExactlyOnceWith(false);
    expect(f.editor.state.pm.selection).toBe(before);
    expect(f.editor.view.getTextRangeRects).toHaveBeenCalledTimes(2);
    expect(f.editor.view.getTextRangeRects).toHaveBeenLastCalledWith({ from: 9, to: 11 }, f.editor.state.doc);
    const end = new Event("touchend", { bubbles: true, cancelable: true });
    f.plane.dispatchEvent(end);
    expect(end.defaultPrevented).toBe(true);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
    f.plane.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    f.pointer("pointerdown");
    f.pointer("pointerup");
    expect(f.toggle).toHaveBeenLastCalledWith(true);
  });

  it.each(["move", "multitouch", "cancel", "scroll", "blur", "document", "selection", "longpress", "release-outside", "destroy"])(
    "yields on %s without intercepting a later release", reason => {
      const f = fixture();
      const down = f.pointer("pointerdown");
      if (reason === "move") f.pointer("pointermove", { clientX: 35 });
      if (reason === "multitouch") f.pointer("pointerdown", { pointerId: 2, isPrimary: false });
      if (reason === "cancel") f.pointer("pointercancel");
      if (reason === "scroll") f.root.dispatchEvent(new Event("scroll"));
      if (reason === "blur") window.dispatchEvent(new Event("blur"));
      if (reason === "document") f.editor.state.doc = {};
      if (reason === "selection") f.editor.state.pm.selection = { ...f.editor.state.pm.selection, to: 21 };
      if (reason === "longpress") Object.defineProperty(down, "timeStamp", { value: -500 });
      if (reason === "destroy") f.release();
      const up = f.pointer("pointerup", reason === "release-outside" ? { clientX: 50 } : {});
      expect(up.defaultPrevented).toBe(false);
      expect(f.toggle).not.toHaveBeenCalled();
    }
  );

  it("does not swallow keyboard activation or an unrelated product action after a consumed tap", () => {
    const f = fixture();
    f.pointer("pointerdown"); f.pointer("pointerup");
    const keyClick = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 });
    f.plane.dispatchEvent(keyClick);
    expect(keyClick.defaultPrevented).toBe(false);
    const button = document.createElement("button"); f.root.append(button);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
    button.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });

  it.each(["mouse", "gap", "collapsed", "node", "missing-geometry", "outside-range"])("does not own %s presses", reason => {
    const f = fixture();
    if (reason === "gap") f.editor.view.getTextRangeRects.mockReturnValue([{ x: 10, y: 60, width: 30, height: 20 }]);
    if (reason === "collapsed") f.editor.state.pm.selection.empty = true;
    if (reason === "node") f.editor.state.pm.selection.toJSON = () => ({ type: "node" });
    if (reason === "missing-geometry") f.editor.view.getTextRangeRects.mockReturnValue([]);
    if (reason === "outside-range") f.editor.view.posAtCoords.mockReturnValue({ pos: 30 });
    const init = reason === "mouse" ? { pointerType: "mouse" } : {};
    f.pointer("pointerdown", init);
    expect(f.pointer("pointerup", init).defaultPrevented).toBe(false);
    expect(f.toggle).not.toHaveBeenCalled();
  });
});
