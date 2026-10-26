import { describe, expect, it } from "vitest";
import type { QuireLayoutAnchor } from "../../../types";
import { compileQuireInlineSourceVisualOccurrences } from "./compile";

describe("inline source visual occurrence compilation", () => {
  it("produces distinct page occurrences while preserving logical source identity", () => {
    const result = compileQuireInlineSourceVisualOccurrences({
      anchors: [createLogicalAnchor()],
      projections: [
        {
          pageIndex: 0,
          sourceRange: { from: 0, to: 20 },
          visualInstanceId: "page:0:body",
          columnRect: { x: 30, y: 40, width: 500, height: 700 },
          marginRect: { x: 30, y: 40, width: 500, height: 700 },
          pageRect: { x: 0, y: 0, width: 560, height: 780 },
          dx: 30,
          dy: 40
        },
        {
          pageIndex: 1,
          sourceRange: { from: 0, to: 20 },
          visualInstanceId: "page:1:repeated-header",
          columnRect: { x: 30, y: 840, width: 500, height: 700 },
          marginRect: { x: 30, y: 840, width: 500, height: 700 },
          pageRect: { x: 0, y: 800, width: 560, height: 780 },
          dx: 30,
          dy: 840
        }
      ],
      mode: "complete"
    });

    expect(result.gaps).toEqual([]);
    expect(result.anchors.map((anchor) => ({
      id: anchor.id,
      sourceAnchorId: anchor.sourceAnchorId,
      occurrence: anchor.occurrence,
      rect: anchor.rect,
      ownerInstanceId: anchor.owner.region.visualInstanceId
    }))).toEqual([
      {
        id: "fixture:inline:occurrence:page:0:body:root:body:region:body",
        sourceAnchorId: "fixture:inline",
        occurrence: {
          kind: "page",
          pageIndex: 0,
          visualInstanceId: "page:0:body:root:body:region:body"
        },
        rect: { x: 40, y: 60, width: 0, height: 18 },
        ownerInstanceId: "page:0:body:root:body:region:body"
      },
      {
        id: "fixture:inline:occurrence:page:1:repeated-header:root:body:region:body",
        sourceAnchorId: "fixture:inline",
        occurrence: {
          kind: "page",
          pageIndex: 1,
          visualInstanceId: "page:1:repeated-header:root:body:region:body"
        },
        rect: { x: 40, y: 860, width: 0, height: 18 },
        ownerInstanceId: "page:1:repeated-header:root:body:region:body"
      }
    ]);
  });

  it("filters unmounted sources without inventing gaps", () => {
    const result = compileQuireInlineSourceVisualOccurrences({
      anchors: [createLogicalAnchor()],
      projections: [],
      mode: "mounted-window"
    });

    expect(result).toEqual({ anchors: [], gaps: [] });
  });

  it("reports missing complete projection and invalid owner identity", () => {
    const missing = compileQuireInlineSourceVisualOccurrences({
      anchors: [createLogicalAnchor()],
      projections: [],
      mode: "complete"
    });
    const invalid = compileQuireInlineSourceVisualOccurrences({
      anchors: [{
        ...createLogicalAnchor(),
        owner: {
          ...createLogicalAnchor().owner,
          source: { sourceId: "" }
        }
      }],
      projections: [{
        pageIndex: 0,
        sourceRange: { from: 0, to: 20 },
        visualInstanceId: "page:0:body",
        columnRect: { x: 0, y: 0, width: 500, height: 700 },
        marginRect: { x: 0, y: 0, width: 500, height: 700 },
        pageRect: { x: 0, y: 0, width: 560, height: 780 },
        dx: 0,
        dy: 0
      }],
      mode: "complete"
    });

    expect(missing.gaps).toEqual([expect.objectContaining({
      code: "missing-page-occurrence",
      sourceAnchorId: "fixture:inline"
    })]);
    expect(invalid.gaps).toEqual([expect.objectContaining({
      code: "invalid-owner-identity",
      sourceAnchorId: "fixture:inline",
      pageIndex: 0
    })]);
  });
});

/**
 * Creates one valid logical source anchor before visual occurrence projection.
 *
 * @returns Logical source anchor fixture.
 */
function createLogicalAnchor(): QuireLayoutAnchor {
  return {
    id: "fixture:inline",
    sourceAnchorId: "fixture:inline",
    kind: "inline-source",
    nodeType: "diagram",
    range: { from: 8, to: 9 },
    position: { pos: 8, bias: 1 },
    affinity: "before",
    occurrence: { kind: "single" },
    rect: { x: 10, y: 20, width: 0, height: 18 },
    placementReferences: {
      anchor: { x: 10, y: 20, width: 0, height: 18 },
      line: { x: 4, y: 20, width: 120, height: 18 },
      paragraph: { x: 4, y: 20, width: 500, height: 36 },
      containingRegion: { x: 0, y: 0, width: 520, height: 740 }
    },
    owner: {
      region: {
        rootId: { value: "root:body" },
        regionId: { value: "region:body" },
        kind: "body"
      },
      source: {
        sourceId: "doc:body",
        range: { from: 0, to: 20 }
      },
      capabilities: {
        editable: true,
        selectable: true,
        focusable: true,
        copyable: true,
        commandable: true,
        accessible: true
      }
    }
  };
}
