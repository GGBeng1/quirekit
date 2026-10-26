import { describe, expect, it } from "vitest";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import { findQuireDecorationNode } from "./node";

describe("node decoration geometry", () => {
  it("uses the start-aligned layout node of the decorated range", () => {
    const snapshot = createPartialSnapshot();

    expect(findQuireDecorationNode(snapshot, { from: 10, to: 20 })?.id).toBe("control");
  });

  it("paints nothing for a node outside the laid-out part instead of outlining the root", () => {
    const snapshot = createPartialSnapshot();

    expect(findQuireDecorationNode(snapshot, { from: 400, to: 450 })).toBeNull();
  });
});

/** @returns Snapshot whose root spans the document while only the first chunk is laid out. */
function createPartialSnapshot(): QuireLayoutSnapshot {
  const rect = { x: 0, y: 0, width: 100, height: 20 };
  return {
    root: {
      id: "root",
      kind: "block",
      range: { from: 0, to: 1000 },
      rect: { x: 0, y: 0, width: 800, height: 14000 },
      children: [{
        id: "chunk",
        kind: "block",
        range: { from: 1, to: 100 },
        rect,
        children: [{ id: "control", kind: "block", range: { from: 10, to: 20 }, rect, children: [] }]
      }]
    }
  } as unknown as QuireLayoutSnapshot;
}
