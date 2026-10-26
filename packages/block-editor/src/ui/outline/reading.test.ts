// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Editor } from "@quirekit/core";
import type { BlockOutlineEntry } from "../state/types";
import { createReadingOutline } from "./reading";

/** @param count - Number of public heading anchors. @returns A deterministic mounted geometry fixture and counters. */
function fixture(count = 6) {
  const frames = new Map<number, FrameRequestCallback>();
  let sequence = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++sequence, callback); return sequence; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
  let resized = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal("ResizeObserver", vi.fn(function(callback: () => void) {
    resized = callback;
    return { observe: vi.fn(), disconnect };
  }));
  const viewport = document.createElement("main"), root = document.createElement("article");
  viewport.append(root); document.body.append(viewport);
  Object.defineProperties(viewport, { clientHeight: { value: 400 }, scrollHeight: { value: count * 120 + 200 } });
  vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 100, 800, 400));
  let offset = 0;
  const hidden = new Set<number>();
  const rect = vi.fn((index: number) => new DOMRect(20, 150 + index * 120 + offset - viewport.scrollTop, 600, 30));
  const elements = Array.from({ length: count }, (_, index) => {
    const element = document.createElement("h2"); root.append(element);
    vi.spyOn(element, "getBoundingClientRect").mockImplementation(() => rect(index));
    vi.spyOn(element, "getClientRects").mockImplementation(() => (hidden.has(index) ? [] : [new DOMRect()]) as unknown as DOMRectList);
    return element;
  });
  let headings = elements.map((_, index) => ({ pos: index * 10 } as BlockOutlineEntry));
  let doc = {};
  let geometry = () => {};
  const releaseGeometry = vi.fn();
  const nodeDOM = vi.fn((pos: number) => elements[pos / 10] ?? null);
  const chain = { setTextSelection: vi.fn().mockReturnThis(), focus: vi.fn().mockReturnThis(), run: vi.fn() };
  const editor = { get state() { return { doc }; }, chain: () => chain, mountedView: { dom: root, nodeDOM,
    onGeometryUpdate: (listener: () => void) => { geometry = listener; return releaseGeometry; } } } as unknown as Editor;
  const activate = vi.fn();
  const controller = createReadingOutline({ editor, viewport, headings: () => headings, activate });
  return {
    viewport, controller, activate, nodeDOM, rect, chain, frames, hidden, disconnect, releaseGeometry,
    /** Commits one animation frame without flushing a newly scheduled frame recursively. */
    flush() { const batch = [...frames.values()]; frames.clear(); batch.forEach(callback => callback(0)); },
    /** @param top - Native scroll offset. */
    scroll(top: number) { viewport.scrollTop = top; viewport.dispatchEvent(new Event("scroll")); },
    /** Simulates a public geometry commit, including selection-only commits. */
    geometry() { geometry(); },
    /** @param shift - Geometry movement caused by image/font/container size changes. */
    resize(shift = 0) { offset = shift; resized(); },
    /** Replaces canonical state before its corresponding retained DOM commit. */
    replaceDocument() { doc = {}; headings = headings.slice(1); controller.refresh(); }
  };
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.replaceChildren(); });

describe("reading outline geometry and work bounds", () => {
  it("follows both scroll directions, skips hidden headings and reaches the short final chapter", () => {
    const f = fixture();
    f.hidden.add(2);
    f.flush(); expect(f.activate).toHaveBeenLastCalledWith(0);
    f.scroll(260); f.flush(); expect(f.activate).toHaveBeenLastCalledWith(10);
    f.scroll(400); f.flush(); expect(f.activate).toHaveBeenLastCalledWith(30);
    f.scroll(130); f.flush(); expect(f.activate).toHaveBeenLastCalledWith(10);
    f.scroll(520); f.flush(); expect(f.activate).toHaveBeenLastCalledWith(50);
    f.controller.destroy();
  });

  it("coalesces scrolls, bounds geometry queries logarithmically and ignores selection-only commits", () => {
    const f = fixture(1024);
    f.flush(); f.rect.mockClear(); f.nodeDOM.mockClear(); f.activate.mockClear();
    for (let index = 0; index < 20; index += 1) f.scroll(120 * 500 + 10);
    expect(f.frames.size).toBe(1);
    f.flush();
    expect(f.activate).toHaveBeenCalledExactlyOnceWith(5000);
    expect(f.rect.mock.calls.length).toBeLessThanOrEqual(11);
    expect(f.nodeDOM).not.toHaveBeenCalled();
    f.rect.mockClear();
    for (let index = 0; index < 20; index += 1) f.geometry();
    expect(f.frames.size).toBe(0); expect(f.rect).not.toHaveBeenCalled();
    f.controller.destroy();
  });

  it("rebuilds after resize and waits for the new document's committed geometry", () => {
    const f = fixture(); f.flush(); f.scroll(260); f.flush();
    expect(f.activate).toHaveBeenLastCalledWith(20);
    f.nodeDOM.mockClear(); f.replaceDocument(); f.flush();
    expect(f.nodeDOM).not.toHaveBeenCalled();
    f.geometry(); f.flush(); expect(f.nodeDOM).toHaveBeenCalledTimes(5);
    f.resize(200); f.flush(); expect(f.activate).toHaveBeenLastCalledWith(10);
    f.hidden.add(1); f.resize(); f.flush(); expect(f.activate).toHaveBeenLastCalledWith(20);
    f.controller.destroy();
  });

  it("aligns navigation with the reading line and stops all work after release", () => {
    const f = fixture(); f.flush(); f.controller.navigate(30); f.geometry(); f.flush();
    expect(f.chain.setTextSelection).toHaveBeenCalledWith(31);
    expect(f.chain.focus).toHaveBeenCalledWith(null, { scrollIntoView: false });
    expect(f.viewport.scrollTop).toBe(362); expect(f.activate).toHaveBeenLastCalledWith(30);
    f.scroll(400); expect(f.frames.size).toBe(1);
    f.controller.destroy();
    expect(f.frames.size).toBe(0); expect(f.disconnect).toHaveBeenCalledOnce(); expect(f.releaseGeometry).toHaveBeenCalledOnce();
    f.nodeDOM.mockClear(); f.rect.mockClear(); f.scroll(0); f.resize(); f.geometry(); f.flush();
    expect(f.frames.size).toBe(0); expect(f.rect).not.toHaveBeenCalled(); expect(f.nodeDOM).not.toHaveBeenCalled();
  });

  it("clears the active chapter when all headings are hidden and handles an empty outline", () => {
    const f = fixture(); f.flush();
    for (let index = 0; index < 6; index += 1) f.hidden.add(index);
    f.resize(); f.flush(); expect(f.activate).toHaveBeenLastCalledWith(undefined); f.controller.destroy();
    const empty = fixture(0); empty.flush(); expect(empty.nodeDOM).not.toHaveBeenCalled(); empty.controller.destroy();
  });
});
