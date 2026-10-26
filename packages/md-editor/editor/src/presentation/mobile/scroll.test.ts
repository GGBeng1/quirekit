import { afterEach, expect, it, vi } from "vitest";
import type { EditorView } from "@quirekit/cm-view";
import { applySourceScrollStep, sourceScrollStep } from "@quirekit/msfe-core";
import { MobileSelectionScroll, mobileEdgeDelta } from "./scroll";
vi.mock("./geometry", () => ({ mobileHandleMargin: 32 }));

vi.mock("@quirekit/msfe-core", () => ({ sourceViewport: () => ({ left: 0, right: 393, top: 48, bottom: 400 }),
  sourceScrollStep: vi.fn(() => ({ owner: {}, top: 10, left: 0 })), applySourceScrollStep: vi.fn() }));
afterEach(() => vi.clearAllMocks());

it("replays a stationary edge point once per frame and stops on release or exhaustion", () => {
  const frames = new Map<number, FrameRequestCallback>(); let id = 0, enabled = true;
  const win = { requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; }, cancelAnimationFrame: (id: number) => frames.delete(id) };
  const view = { dom: { ownerDocument: { defaultView: win } } } as unknown as EditorView;
  const track = vi.fn(), scroll = new MobileSelectionScroll(view, () => enabled, track);
  /** @param time - Frame timestamp. */
  function frame(time: number): void { const [id, callback] = [...frames.entries()][0]!; frames.delete(id); callback(time); }
  scroll.move({ x: 200, y: 430 });
  expect(track).toHaveBeenLastCalledWith({ x: 200, y: 366 }); expect(frames.size).toBe(1);
  frame(16); frame(32); frame(48);
  expect(track).toHaveBeenCalledTimes(4); expect(applySourceScrollStep).toHaveBeenCalledTimes(3); expect(frames.size).toBe(1);
  scroll.cancel(); expect(frames.size).toBe(0);
  scroll.move({ x: 200, y: 10 });
  vi.mocked(sourceScrollStep).mockReturnValueOnce(null);
  frame(64); expect(frames.size).toBe(0);
  expect(track).toHaveBeenLastCalledWith({ x: 200, y: 82 });
  scroll.move({ x: 200, y: 430 }); enabled = false;
  const count = track.mock.calls.length; frame(80);
  expect(track).toHaveBeenCalledTimes(count); expect(frames.size).toBe(0);
});

it("normal motion has no scroll loop and frame pauses cannot produce large jumps", () => {
  const bounds = { left: 0, right: 393, top: 48, bottom: 400 };
  expect(mobileEdgeDelta({ x: 10, y: 200 }, bounds)).toBe(0);
  expect(mobileEdgeDelta({ x: 10, y: 430 }, bounds, 5000)).toBe(23.04);
  expect(mobileEdgeDelta({ x: 10, y: 0 }, bounds, 5000)).toBe(-23.04);
});
