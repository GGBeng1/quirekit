import { describe, expect, it } from "vitest";
import { resolveOverlayBoundaryPosition } from "./boundary";
import type { ClassicEditorOverlayBoundaryInput } from "./types";

const input: ClassicEditorOverlayBoundaryInput = {
  anchor: { x: 400, y: 300, rects: [{ x: 350, y: 300, width: 100, height: 40 }] },
  placement: "top", boundary: { x: 100, y: 150, width: 800, height: 500 },
  surface: { width: 480, height: 76 }
};

describe("document overlay viewport boundaries", () => {
  it("keeps the preferred side when it fits", () => {
    expect(resolveOverlayBoundaryPosition(input)).toEqual({ x: 160, y: 216 });
  });
  it("flips below a target near the ruler and shifts inside the workspace", () => {
    expect(resolveOverlayBoundaryPosition({ ...input,
      anchor: { x: 120, y: 165, rects: [{ x: 110, y: 165, width: 20, height: 30 }] }
    })).toEqual({ x: 108, y: 203 });
  });
  it("retains a toolbar when the selection start has left but its end is visible", () => {
    expect(resolveOverlayBoundaryPosition({ ...input,
      anchor: { x: 400, y: 70, rects: [{ x: 350, y: 70, width: 100, height: 120 }] }
    })).toEqual({ x: 160, y: 198 });
  });
  it("releases the top constraint continuously only after the complete target leaves", () => {
    const atEdge = resolveOverlayBoundaryPosition({ ...input,
      anchor: { x: 400, y: 110, rects: [{ x: 350, y: 110, width: 100, height: 40 }] }
    });
    const outside = resolveOverlayBoundaryPosition({ ...input,
      anchor: { x: 400, y: 85, rects: [{ x: 350, y: 85, width: 100, height: 40 }] }
    });
    expect(atEdge.y).toBe(158);
    expect(outside.y).toBe(atEdge.y - 25);
    expect(resolveOverlayBoundaryPosition(input)).toEqual({ x: 160, y: 216 });
  });
  it("flips a right-side card to the left and handles bottom overflow", () => {
    expect(resolveOverlayBoundaryPosition({ ...input, placement: "right-start",
      anchor: { x: 860, y: 610, rects: [{ x: 800, y: 610, width: 60, height: 30 }] },
      surface: { width: 240, height: 120 }
    })).toEqual({ x: 552, y: 522 });
  });
  it("uses a visible fragment rather than a gap in a cross-page union", () => {
    expect(resolveOverlayBoundaryPosition({ ...input, anchor: { x: 400, y: -300,
      rects: [{ x: 350, y: -300, width: 100, height: 40 }, { x: 350, y: 400, width: 100, height: 40 }]
    } })).toEqual({ x: 160, y: 316 });
  });
  it("clamps exact positions without adding a second gap", () => {
    expect(resolveOverlayBoundaryPosition({ ...input, placement: "exact",
      anchor: { x: 850, y: 600, rects: input.anchor.rects }
    })).toEqual({ x: 412, y: 566 });
  });
  it("limits oversized surfaces and also releases horizontal constraints", () => {
    expect(resolveOverlayBoundaryPosition({ ...input, surface: { width: 1000, height: 800 } }))
      .toEqual({ x: 108, y: 158 });
    expect(resolveOverlayBoundaryPosition({ ...input,
      anchor: { x: 60, y: 300, rects: [{ x: 40, y: 300, width: 40, height: 40 }] }
    })).toEqual({ x: 88, y: 216 });
  });
});
