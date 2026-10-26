// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import type { EditorView } from "@quirekit/cm-view";
import { captureScrollAnchor, restoreScrollAnchor, scrollAnchorEffects } from "./scroll";
import { sourceViewport, sourceScrollStep, applySourceScrollStep } from "../input/geometry/viewport";
import { compositionField, compositionEffect } from "../state/fields";
import { revealSelectionField, revealSelectionEffect } from "../presentation/gesture";

vi.mock("../input/geometry/viewport", () => ({ sourceViewport: vi.fn(() => ({ top: 80, bottom: 800, left: 0, right: 800 })),
  sourceScrollStep: vi.fn(), applySourceScrollStep: vi.fn() }));
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

/** @returns A window-scrolled view with an unscrolled inner surface and controlled geometry. */
function fixture() {
  let state = EditorState.create({ doc: "first\nvisible\nlast" }), top = 76;
  const lineBlockAtHeight = vi.fn(() => ({ from: 6 }));
  const view = { dom: document.createElement("div"), contentDOM: document.createElement("div"), scrollDOM: { scrollTop: 0 }, documentTop: -1000,
    defaultLineHeight: 20, posAtCoords: () => null,
    get state() { return state; }, lineBlockAtHeight, coordsAtPos: () => ({ top, bottom: top + 20 }), requestMeasure: vi.fn() } as unknown as EditorView;
  return { view, lineBlockAtHeight, move(value: number) { top = value; }, replace() { state = EditorState.create({ doc: "replacement" }); } };
}

it("captures the actual viewport rather than the inner scroller's zero offset", () => {
  const f = fixture(), anchor = captureScrollAnchor(f.view)!;
  expect(f.lineBlockAtHeight).toHaveBeenCalledWith(1080);
  expect(anchor).toEqual({ doc: f.view.state.doc, position: 6, offset: -4 });
  expect(scrollAnchorEffects(anchor)[0]!.value).toMatchObject({ range: { head: 6 }, y: "start", yMargin: -4 });
  expect(scrollAnchorEffects(undefined)).toEqual([]);
});

it("keeps an already visible character at its exact viewport offset", () => {
  const f = fixture(); f.move(300);
  const anchor = captureScrollAnchor(f.view)!;
  expect(anchor).toEqual({ doc: f.view.state.doc, position: 0, offset: 220 });
  expect(f.lineBlockAtHeight).not.toHaveBeenCalled();
});

it("shares the original character across a pending mode and reveal batch, then releases it on user input", () => {
  const f = fixture(); f.move(300);
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(7);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const first = captureScrollAnchor(f.view)!;
  restoreScrollAnchor(f.view, first, () => true); f.move(500);
  expect(captureScrollAnchor(f.view)).toBe(first);
  restoreScrollAnchor(f.view, first, () => true);
  document.dispatchEvent(new Event("pointerdown"));
  expect(captureScrollAnchor(f.view)?.offset).toBe(420);
});

it("corrects through the shared scroll owner and ignores retired documents", () => {
  const f = fixture(), anchor = captureScrollAnchor(f.view)!;
  let frame: FrameRequestCallback | undefined;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frame = callback; return 1; });
  const step = { owner: window, top: 1024, left: 0 };
  vi.mocked(sourceScrollStep).mockReturnValue(step);
  restoreScrollAnchor(f.view, anchor, () => true); f.move(100); frame!(0);
  const request = vi.mocked(f.view.requestMeasure).mock.calls[0]![0]!;
  request.write!(request.read(f.view), f.view);
  expect(sourceScrollStep).toHaveBeenCalledWith(f.view, 24);
  expect(applySourceScrollStep).toHaveBeenCalledWith(step);
  f.replace(); expect(request.read(f.view)).toBeNull();
  expect(sourceViewport).toHaveBeenCalled();
});

it("cancels a deferred correction when a newer navigation owns the viewport", () => {
  const f = fixture(); let frame: FrameRequestCallback | undefined;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frame = callback; return 7; });
  const cancelFrame = vi.spyOn(window, "cancelAnimationFrame");
  const cancel = restoreScrollAnchor(f.view, captureScrollAnchor(f.view), () => true);
  cancel(); frame!(0);
  expect(cancelFrame).toHaveBeenCalledWith(7); expect(f.view.requestMeasure).not.toHaveBeenCalled();
});

it("does not measure while composition or pointer selection owns the DOM", () => {
  let state = EditorState.create({ doc: "text", extensions: [compositionField, revealSelectionField] });
  const view = { get state() { return state; }, compositionStarted: true } as unknown as EditorView;
  expect(captureScrollAnchor(view)).toBeUndefined();
  Object.assign(view, { compositionStarted: false });
  state = state.update({ effects: compositionEffect.of(true) }).state;
  expect(captureScrollAnchor(view)).toBeUndefined();
  state = state.update({ effects: compositionEffect.of(false) }).state;
  state = state.update({ effects: revealSelectionEffect.of(state.selection) }).state;
  expect(captureScrollAnchor(view)).toBeUndefined();
  expect(sourceViewport).not.toHaveBeenCalled();
});
