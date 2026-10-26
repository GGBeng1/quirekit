import { describe, expect, it } from "vitest";
import { resolveClassicEditorObjectBarPlacement } from ".";

describe("object floating-bar placement", () => {
  it("prefers an unobscured fragment above a cross-page object", () => {
    const placement = resolveClassicEditorObjectBarPlacement({
      anchor: {
        status: "ready",
        coordinateSpace: "client",
        snapshotVersion: 2,
        kind: "node",
        nodeId: "drawing-1",
        rects: [
          { x: 120, y: -300, width: 400, height: 200 },
          { x: 120, y: 240, width: 400, height: 180 }
        ],
        referenceRect: { x: 120, y: -300, width: 400, height: 720 },
        sourceTargetIds: ["drawing-1:first", "drawing-1:second"]
      },
      boundary: { x: 0, y: 0, width: 1000, height: 800 },
      surface: { width: 360, height: 40 },
      gap: 8
    });
    expect(placement.status).toBe("ready");
    if (placement.status === "ready") {
      expect(placement.reference).toEqual({ x: 120, y: 240, width: 400, height: 180 });
      expect(placement.side).toBe("top");
      expect(placement.y).toBe(192);
      expect(placement.occlusion).toBe("none");
    }
  });

  it("returns explicit unsupported state instead of guessing stale geometry", () => {
    expect(resolveClassicEditorObjectBarPlacement({
      anchor: { status: "stale", kind: "node", expectedSnapshotVersion: 3, snapshotVersion: 4 },
      boundary: { x: 0, y: 0, width: 390, height: 816 },
      surface: { width: 360, height: 44 },
      gap: 8
    })).toEqual({ status: "unavailable", reason: "stale" });
  });
});
