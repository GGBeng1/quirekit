import { describe, expect, it } from "vitest";
import type { QuireLayoutNode } from "../../../layout";
import { buildQuireSubLayoutCaretGeometry } from "./geometry";

describe("buildQuireSubLayoutCaretGeometry", () => {
  it("prefers leading caret affinity for duplicate wrapped positions by default", () => {
    const nodes: readonly QuireLayoutNode[] = [
      {
        id: "table-cell",
        kind: "block",
        range: { from: 1, to: 8 },
        rect: { x: 0, y: 0, width: 100, height: 48 },
        subLayoutQueryProducts: {
          selectionRects: [],
          hitTargets: [],
          inputAnchors: [],
          caretStops: [
            {
              textFragmentId: "caret-line-0",
              position: { pos: 4, bias: -1 },
              rect: { x: 80, y: 0, width: 1, height: 24 },
              fragmentId: "line-0"
            },
            {
              textFragmentId: "caret-line-24",
              position: { pos: 4, bias: 1 },
              rect: { x: 0, y: 24, width: 1, height: 24 },
              fragmentId: "line-1"
            }
          ]
        },
        children: []
      }
    ];

    expect(buildQuireSubLayoutCaretGeometry(nodes, 4, 1)).toEqual({
      position: { pos: 4, bias: 1 },
      rect: { x: 0, y: 24, width: 1, height: 24 }
    });
  });
});
