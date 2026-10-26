import { describe, expect, it } from "vitest";
import { createQuireBoundaryMarkerSegments } from "./boundary-marker";

describe("boundary marker paths", () => {
  const rect = { x: 10, y: 0, width: 4, height: 20 };

  it("opens a bracket toward the text on its right", () => {
    const segments = createQuireBoundaryMarkerSegments(rect, "open-bracket");
    expect(segments[0]).toEqual({ kind: "move-to", point: { x: 14, y: 2.4 } });
    expect(segments.at(-1)).toEqual({ kind: "line-to", point: { x: 14, y: 17.6 } });
    expect(segments.some(segment => segment.kind === "close-path")).toBe(false);
  });

  it("closes a bracket toward the text on its left", () => {
    const segments = createQuireBoundaryMarkerSegments(rect, "close-bracket");
    expect(segments[0]).toEqual({ kind: "move-to", point: { x: 10, y: 2.4 } });
    expect(segments[1]).toEqual({ kind: "line-to", point: { x: 13.5, y: 2.4 } });
  });

  it("draws an insertion bar centered in its rectangle", () => {
    const segments = createQuireBoundaryMarkerSegments(rect, "insertion-bar");
    expect(segments).toContainEqual({ kind: "line-to", point: { x: 12, y: 17.6 } });
  });
});
