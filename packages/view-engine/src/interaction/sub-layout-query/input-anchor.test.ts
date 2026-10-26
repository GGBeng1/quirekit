import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import { describe, expect, it } from "vitest";
import type {
  QuireLayoutNode
} from "../../layout";
import { resolveQuireSubLayoutInputAnchor } from "./input-anchor";

describe("resolveQuireSubLayoutInputAnchor", () => {
  it("prefers leading input affinity for duplicate wrapped caret positions", () => {
    const nodes: readonly QuireLayoutNode[] = [
      {
        id: "table-cell",
        kind: "block",
        range: { from: 1, to: 8 },
        rect: { x: 0, y: 0, width: 100, height: 48 },
        subLayoutQueryProducts: {
          selectionRects: [],
          hitTargets: [],
          caretStops: [],
          inputAnchors: [
            {
              position: { pos: 4, bias: -1 },
              rect: { x: 80, y: 0, width: 1, height: 24 },
              role: "caret"
            },
            {
              position: { pos: 4, bias: 1 },
              rect: { x: 0, y: 24, width: 1, height: 24 },
              role: "caret"
            }
          ]
        },
        children: []
      }
    ];

    expect(resolveQuireSubLayoutInputAnchor(nodes, 4, "caret")?.rect).toEqual({
      x: 0,
      y: 24,
      width: 1,
      height: 24
    });
  });

  it("uses a reference rect to choose the visible repeated anchor", () => {
    const nodes: readonly QuireLayoutNode[] = [
      {
        id: "table-cell",
        kind: "block",
        range: { from: 1, to: 8 },
        rect: { x: 0, y: 0, width: 100, height: 220 },
        subLayoutQueryProducts: {
          selectionRects: [],
          hitTargets: [],
          caretStops: [],
          inputAnchors: [
            {
              position: { pos: 4, bias: 1 },
              rect: { x: 0, y: 24, width: 1, height: 24 },
              role: "caret"
            },
            {
              position: { pos: 4, bias: 1 },
              rect: { x: 0, y: 184, width: 1, height: 24 },
              role: "caret"
            }
          ]
        },
        children: []
      }
    ];

    expect(
      resolveQuireSubLayoutInputAnchor(
        nodes,
        4,
        "caret",
        { x: 40, y: 184, width: 1, height: 24 }
      )?.rect
    ).toEqual({
      x: 0,
      y: 184,
      width: 1,
      height: 24
    });
  });

  it("preserves query-product owner facts on the selected anchor", () => {
    const queryOwner: QuireLayoutQueryProductOwner = {
      sourceRootId: "table-cell:semantic-a:cell-a",
      sourceFragmentId: "cell-a#p2",
      coordinateSpace: "document",
      sourceCoordinateSpace: "table-cell-local"
    };
    const nodes: readonly QuireLayoutNode[] = [
      {
        id: "table-cell",
        kind: "block",
        range: { from: 1, to: 8 },
        rect: { x: 0, y: 0, width: 100, height: 48 },
        subLayoutQueryProducts: {
          selectionRects: [],
          hitTargets: [],
          caretStops: [],
          inputAnchors: [
            {
              position: { pos: 4, bias: 1 },
              rect: { x: 0, y: 24, width: 1, height: 24 },
              role: "caret",
              queryOwner
            }
          ]
        },
        children: []
      }
    ];

    expect(resolveQuireSubLayoutInputAnchor(nodes, 4, "caret")?.queryOwner)
      .toBe(queryOwner);
  });
});
