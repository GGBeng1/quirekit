import { describe, expect, it } from "vitest";
import { resizeQuireDrawingFrame } from "./frame";
import { createQuireDrawingManipulationTrack } from "../manipulation";

const frame = { rect: { x: 32, y: 70, width: 480, height: 288 }, rotation: 0 };
const minimum = { width: 120, height: 120 };
const resizePolicy = { minimumExtent: minimum, maximumExtent: { width: 2000, height: 2000 },
  extentStep: 1, preserveOrigin: true };

describe("owner-constrained resize geometry", () => {
  it("softly snaps horizontal handles to content width and releases past the tolerance", () => {
    const policy = { ...resizePolicy, widthSnap: { targetWidth: 576, tolerance: 6 } };
    for (const delta of [90, 95, 101, 102]) {
      const preview = resizeQuireDrawingFrame(frame, { x: 0, y: 0 }, { x: delta, y: 0 }, "east", false, minimum, policy);
      expect(preview.rect).toEqual({ x: 32, y: 70, width: 576, height: 288 });
    }
    expect(resizeQuireDrawingFrame(frame, { x: 0, y: 0 }, { x: 113, y: 0 }, "east", false, minimum, policy).rect.width).toBe(593);
    expect(resizeQuireDrawingFrame(frame, { x: 0, y: 0 }, { x: -93, y: 0 }, "west", false, minimum, policy).rect.width).toBe(576);
    expect(resizeQuireDrawingFrame(frame, { x: 0, y: 0 }, { x: 93, y: 0 }, "east", true, minimum, policy).rect)
      .toEqual({ x: 32, y: 70, width: 576, height: 346 });
    // A vertical gesture remains under its own authority even when Shift grows width near the boundary.
    expect(resizeQuireDrawingFrame(frame, { x: 0, y: 0 }, { x: 0, y: 55 }, "south", true, minimum, policy).rect.width).toBe(572);
  });
  it("ignores unavailable or inadmissible snap targets without inventing a width clamp", () => {
    for (const targetWidth of [NaN, 0, 119, 2001]) {
      const policy = { ...resizePolicy, widthSnap: { targetWidth, tolerance: 1000 } };
      expect(resizeQuireDrawingFrame(frame, { x: 0, y: 0 }, { x: 93, y: 0 }, "east", false, minimum, policy).rect.width).toBe(573);
    }
    const policy = { ...resizePolicy, widthSnap: { targetWidth: 200, tolerance: 6 } };
    expect(resizeQuireDrawingFrame(frame, { x: 0, y: 0 }, { x: -276, y: 0 }, "east", true, minimum, policy).rect)
      .toEqual({ x: 32, y: 70, width: 200, height: 120 });
  });
  it.each(["north-west", "north", "north-east", "east", "south-east", "south", "south-west", "west"] as const)(
    "keeps the inline origin and quantizes %s preview and commit alike", (handle) => {
      const track = createQuireDrawingManipulationTrack("resize", frame, { x: 0, y: 0 },
        { x: 40.43, y: 30.72 }, handle, false, resizePolicy);
      expect(track.previewFrame.rect.x).toBe(32);
      expect(track.previewFrame.rect.y).toBe(70);
      expect(Number.isInteger(track.previewFrame.rect.width)).toBe(true);
      expect(Number.isInteger(track.previewFrame.rect.height)).toBe(true);
    });
  it("clamps both extremes before fixing origin, including proportionate resizing", () => {
    const small = createQuireDrawingManipulationTrack("resize", frame, { x: 0, y: 0 },
      { x: -4000, y: -4000 }, "south-east", false, resizePolicy);
    expect(small.previewFrame.rect).toEqual({ x: 32, y: 70, width: 120, height: 120 });
    const large = createQuireDrawingManipulationTrack("resize", frame, { x: 0, y: 0 },
      { x: 4000, y: 4000 }, "south-east", true, resizePolicy);
    expect(large.previewFrame.rect).toEqual({ x: 32, y: 70, width: 2000, height: 1200 });
  });
  it("leaves the established opposite-edge behavior unchanged without owner policy", () => {
    expect(resizeQuireDrawingFrame(frame, { x: 0, y: 0 }, { x: 20.25, y: 30.5 }, "north-west", false, minimum).rect)
      .toEqual({ x: 52.25, y: 100.5, width: 459.75, height: 257.5 });
  });
});
