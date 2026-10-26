import type { QuireEditor } from "@quirekit/core";
import type { DrawingResizePolicy } from "@quirekit/drawing-geometry";
import { describe, expect, it, vi } from "vitest";
import { captureMountedDrawingResizePolicy } from "./resize-policy";

describe("mounted resize width authority", () => {
  it("captures exact source geometry once and leaves the owner policy immutable", () => {
    const doc = {}, readWidth = vi.fn(() => 496.8);
    const editor = { state: { pm: { doc } }, view: { getTextblockContentWidth: readWidth } } as unknown as QuireEditor;
    const policy: DrawingResizePolicy = Object.freeze({ extentStep: 1, snapToInlineContentWidth: 6 });
    const captured = captureMountedDrawingResizePolicy(editor, 12, policy);
    expect(readWidth).toHaveBeenCalledExactlyOnceWith(12, doc);
    expect(captured?.widthSnap).toEqual({ targetWidth: 496, tolerance: 6 });
    readWidth.mockReturnValue(700);
    expect(captured?.widthSnap?.targetWidth).toBe(496);
    expect(policy.widthSnap).toBeUndefined();
  });
  it("preserves ordinary resize when the snapshot is unavailable or no magnet is requested", () => {
    const readWidth = vi.fn<() => number | null>(() => null);
    const editor = { state: { pm: { doc: {} } }, view: { getTextblockContentWidth: readWidth } } as unknown as QuireEditor;
    const ordinary = { extentStep: 1 };
    expect(captureMountedDrawingResizePolicy(editor, 12, ordinary)).toBe(ordinary);
    expect(readWidth).not.toHaveBeenCalled();
    const policy = { ...ordinary, snapToInlineContentWidth: 6 };
    for (const width of [null, NaN, 0, -1]) {
      readWidth.mockReturnValue(width);
      expect(captureMountedDrawingResizePolicy(editor, 12, policy)).toBe(policy);
    }
  });
});
