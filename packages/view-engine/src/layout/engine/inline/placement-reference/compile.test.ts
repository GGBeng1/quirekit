import type { QuireInlineSourcePlacementDeclaration } from "@quirekit/layout/inline";
import { describe, expect, it } from "vitest";
import type { QuireLayoutAnchor } from "../../types";
import { compileQuireInlineVisualPlacement } from "./compile";

describe("inline anchored-object placement references", () => {
  it.each([{ inlineSize: 200, blockSize: 0 }, { inlineSize: 0, blockSize: 200 }])('positions a one-dimensional visual extent %j without inflating it', extent => {
    const result = compileQuireInlineVisualPlacement(createAnchor(), { ...createPlacement(), extent });
    expect(result).toMatchObject({ status: 'resolved', placement: { rect: { width: extent.inlineSize, height: extent.blockSize } } });
    const inline = compileQuireInlineVisualPlacement(createAnchor(), { ...createPlacement(), layoutMode: 'inline', extent });
    expect(inline).toMatchObject({ status: 'resolved', placement: { rect: { width: extent.inlineSize, height: extent.blockSize } } });
  });
  it.each([{ inlineSize: 0, blockSize: 0 }, { inlineSize: -1, blockSize: 3 }, { inlineSize: Infinity, blockSize: 1 }])('rejects empty or invalid extent %j', extent => {
    expect(compileQuireInlineVisualPlacement(createAnchor(), { ...createPlacement(), extent })).toMatchObject({
      status: 'gap', gaps: [expect.objectContaining({ code: 'invalid-extent' })]
    });
  });
  it("resolves both axes from explicit canonical references", () => {
    const result = compileQuireInlineVisualPlacement(
      createAnchor(),
      createPlacement()
    );

    expect(result).toEqual({
      status: "resolved",
      placement: {
        sourceAnchorId: "source:diagram:1",
        objectId: "diagram:1",
        occurrence: { kind: "single" },
        rect: { x: 112, y: 204, width: 80, height: 40 }
      }
    });
  });

  it("places an inline replacement at its measured caret and baseline", () => {
    const anchor = createAnchor();
    const result = compileQuireInlineVisualPlacement(
      {
        ...anchor,
        placementReferences: {
          ...anchor.placementReferences,
          anchor: { x: 146, y: 200, width: 0, height: 44 }
        }
      },
      {
        ...createPlacement(),
        layoutMode: "inline",
        extent: { inlineSize: 80, blockSize: 40 }
      }
    );

    expect(result).toEqual({
      status: "resolved",
      placement: {
        sourceAnchorId: "source:diagram:1",
        objectId: "diagram:1",
        occurrence: { kind: "single" },
        rect: { x: 146, y: 204, width: 80, height: 40 }
      }
    });
  });

  it("rejects an inline baseline outside the declared block extent", () => {
    const result = compileQuireInlineVisualPlacement(
      createAnchor(),
      {
        ...createPlacement(),
        layoutMode: "inline",
        extent: { inlineSize: 80, blockSize: 40, baselineOffset: 41 }
      }
    );

    expect(result).toEqual({
      status: "gap",
      gaps: [expect.objectContaining({ code: "invalid-extent" })]
    });
  });

  it("excludes placement when the declared page authority is unavailable", () => {
    const placement = createPlacement();
    const result = compileQuireInlineVisualPlacement(
      createAnchor(),
      {
        ...placement,
        inlinePlacement: { kind: "offset", reference: "page", offset: 12 }
      }
    );

    expect(result).toEqual({
      status: "gap",
      gaps: [expect.objectContaining({
        code: "missing-inline-reference",
        sourceAnchorId: "source:diagram:1",
        objectId: "diagram:1",
        reference: "page"
      })]
    });
  });

  it("constrains placement only against the exact containing region", () => {
    const placement = createPlacement();
    const result = compileQuireInlineVisualPlacement(
      createAnchor(),
      {
        ...placement,
        inlinePlacement: { kind: "offset", reference: "column", offset: 500 },
        blockPlacement: { kind: "offset", reference: "paragraph", offset: 300 }
      }
    );

    expect(result).toEqual({
      status: "resolved",
      placement: expect.objectContaining({
        rect: { x: 320, y: 480, width: 80, height: 40 }
      })
    });
  });

  it("activates a table-cell constraint only for a table-cell owner", () => {
    const placement = {
      ...createPlacement(),
      constraintOwnerKind: "table-cell" as const,
      inlinePlacement: { kind: "offset", reference: "column", offset: 500 } as const,
      blockPlacement: { kind: "offset", reference: "paragraph", offset: 300 } as const
    };
    const bodyResult = compileQuireInlineVisualPlacement(
      {
        ...createAnchor(),
        ownerRegionKind: "body"
      },
      placement
    );
    const cellResult = compileQuireInlineVisualPlacement(
      {
        ...createAnchor(),
        ownerRegionKind: "table-cell"
      },
      placement
    );

    expect(bodyResult).toEqual({
      status: "resolved",
      placement: expect.objectContaining({
        rect: { x: 600, y: 500, width: 80, height: 40 }
      })
    });
    expect(cellResult).toEqual({
      status: "resolved",
      placement: expect.objectContaining({
        rect: { x: 320, y: 480, width: 80, height: 40 }
      })
    });
  });

  it("reports inside or outside alignment until page-side authority exists", () => {
    const placement = createPlacement();
    const result = compileQuireInlineVisualPlacement(
      createAnchor(),
      {
        ...placement,
        inlinePlacement: {
          kind: "alignment",
          reference: "column",
          alignment: "inside"
        }
      }
    );

    expect(result).toEqual({
      status: "gap",
      gaps: [expect.objectContaining({
        code: "unsupported-logical-alignment",
        reference: "inside"
      })]
    });
  });
});

/**
 * Creates one fully explicit anchored-object placement fixture.
 *
 * @returns Logical source anchor with exact source-flow references.
 */
function createAnchor(): QuireLayoutAnchor {
  return {
    id: "source:diagram:1",
    sourceAnchorId: "source:diagram:1",
    kind: "inline-source",
    nodeType: "diagramAnchor",
    range: { from: 8, to: 9 },
    position: { pos: 8, bias: 1 },
    affinity: "before",
    occurrence: { kind: "single" },
    rect: { x: 126, y: 210, width: 0, height: 18 },
    placementReferences: {
      anchor: { x: 126, y: 210, width: 0, height: 18 },
      line: { x: 100, y: 210, width: 240, height: 18 },
      paragraph: { x: 100, y: 200, width: 300, height: 60 },
      containingRegion: { x: 80, y: 180, width: 320, height: 340 },
      column: { x: 100, y: 160, width: 300, height: 500 }
    },
    owner: {
      region: {
        rootId: { value: "root:body" },
        regionId: { value: "region:body" },
        kind: "body"
      },
      source: { sourceId: "doc:body", range: { from: 0, to: 20 } },
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

/**
 * Creates the renderer-neutral placement product owned outside the anchor.
 *
 * @returns Explicit placement declaration for the fixture object.
 */
function createPlacement(): QuireInlineSourcePlacementDeclaration {
  return {
    objectId: "diagram:1",
    extent: { inlineSize: 80, blockSize: 40 },
    layoutMode: "anchored",
    anchorMovement: "move-with-text",
    inlinePlacement: { kind: "offset", reference: "column", offset: 12 },
    blockPlacement: { kind: "offset", reference: "paragraph", offset: 4 },
    flowExclusion: { kind: "none" },
    paintOrder: "above-content",
    stackingOrder: 0,
    allowOverlap: true,
    constrainToRegion: true,
    lockAspectRatio: false,
    storyId: null
  };
}
