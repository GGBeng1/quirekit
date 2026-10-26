import { beforeEach, expect, it, vi } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import type { EditorView } from "@quirekit/cm-view";
import { applySourceScrollStep, sourceScrollStep } from "../geometry";
import { SourceInputReveal } from "./reveal";

vi.mock("../geometry", () => ({ sourceViewport: () => ({ top: 50, bottom: 400 }), sourceCaretRect: (view: EditorView, pos: number) => view.coordsAtPos(pos), sourceScrollStep: vi.fn(() => ({ owner: {}, top: 100, left: 0 })), applySourceScrollStep: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

it("coalesces keyboard changes, reveals one endpoint and retires queued work on new user intent", () => {
  const frames = new Map<number, FrameRequestCallback>(); let id = 0, focused = true;
  const win = { requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; }, cancelAnimationFrame: (id: number) => frames.delete(id) };
  const coordinates = vi.fn(() => ({ top: 600, bottom: 620, left: 50, right: 50 }));
  const measures: { read: () => unknown; write: (value: unknown) => void }[] = [];
  const state = EditorState.create({ doc: "abc", selection: { anchor: 2 } });
  const view = { state, dom: { ownerDocument: { defaultView: win } }, contentDOM: { querySelector: () => null },
    coordsAtPos: coordinates, requestMeasure: (request: typeof measures[number]) => measures.push(request) } as unknown as EditorView;
  const reveal = new SourceInputReveal(view, () => focused);
  /** Advance one browser frame, without hiding a queued measure/write phase. */
  function frame(): void { const [id, callback] = [...frames.entries()][0]!; frames.delete(id); callback(16); }
  /** Accept the native measure read before its write. */
  function measure(): void { const request = measures.shift()!; request.write(request.read()); }
  for (let i = 0; i < 30; i++) reveal.request();
  expect(frames.size).toBe(1); frame(); expect(measures).toHaveLength(1);
  for (let i = 0; i < 30; i++) reveal.request(); expect(frames.size).toBe(0);
  measure();
  expect(coordinates).toHaveBeenCalledTimes(1); expect(sourceScrollStep).toHaveBeenLastCalledWith(view, 228);
  expect(applySourceScrollStep).not.toHaveBeenCalled(); frame();
  expect(applySourceScrollStep).toHaveBeenCalledTimes(1); expect(state.doc.toString()).toBe("abc");
  reveal.cancel(); expect(frames.size).toBe(0);
  reveal.request(); frame(); reveal.cancel(); measure();
  expect(coordinates).toHaveBeenCalledTimes(1); expect(applySourceScrollStep).toHaveBeenCalledTimes(1);
  focused = false; reveal.request(); expect(frames.size).toBe(0);
  focused = true; reveal.request(); reveal.destroy(); expect(frames.size).toBe(0);
});

it("waits for document-tail space after keyboard resize, then stops immediately when visible", () => {
  const frames = new Map<number, FrameRequestCallback>(); let id = 0, top = 600;
  const win = { requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; }, cancelAnimationFrame: (id: number) => frames.delete(id) };
  const measures: { read: () => unknown; write: (value: unknown) => void }[] = [];
  const coordinates = vi.fn(() => ({ top, bottom: top + 20, left: 50, right: 50 }));
  const view = { state: EditorState.create({ doc: "abc", selection: { anchor: 2 } }), dom: { ownerDocument: { defaultView: win } },
    contentDOM: { querySelector: () => null }, coordsAtPos: coordinates, requestMeasure: (request: typeof measures[number]) => measures.push(request) } as unknown as EditorView;
  const reveal = new SourceInputReveal(view, () => true);
  /** Advance the pending animation phase, without consuming its later geometry phase. */
  function frame(): void { const [id, callback] = [...frames.entries()][0]!; frames.delete(id); callback(16); }
  /** Accept one measured layout snapshot and its queued continuation. */
  function measure(): void { const request = measures.shift()!; request.write(request.read()); }
  vi.mocked(sourceScrollStep).mockReturnValueOnce(null);
  reveal.request(); frame(); measure();
  expect(applySourceScrollStep).not.toHaveBeenCalled(); expect(frames.size).toBe(1);
  frame(); measure(); frame();
  expect(applySourceScrollStep).toHaveBeenCalledOnce();
  top = 340; frame(); measure();
  expect(frames.size).toBe(0); expect(coordinates).toHaveBeenCalledTimes(3);
  // A host that never contributes enough tail space must not retain a permanent
  // scroll request, even though the source caret remains below its chrome.
  top = 600; coordinates.mockClear(); vi.mocked(sourceScrollStep).mockReturnValue(null);
  reveal.request();
  for (let pass = 0; pass < 8; pass++) { frame(); measure(); }
  expect(frames.size).toBe(0); expect(coordinates).toHaveBeenCalledTimes(8);
  reveal.destroy();
});
