import type { QuireInlineSourceAnchor } from "@quirekit/layout/inline";
import { describe, expect, it } from "vitest";
import type { QuireLayoutBox } from "../../types";
import {
  filterQuireInlineSourceCapabilitySidecarsBySourceAnchorIds,
  sliceQuireInlineSourceCapabilitySidecarsToAnchors,
  sliceQuireInlineSourceProductsToRange
} from "./range";
import type { QuireGapInlineSourceCapabilitySidecar } from "./types";

const anchors: readonly QuireInlineSourceAnchor[] = [
  createAnchor("source:first", "firstAtom", 4),
  createAnchor("source:second", "secondAtom", 12)
];
const firstCapability = createGap("source:first", "firstAtom");

describe("inline source capability range projection", () => {
  it("retains only sidecars whose canonical anchors survive projection", () => {
    expect(sliceQuireInlineSourceProductsToRange({
      ...createBox(),
      sourceAnchors: anchors,
      sourceCapabilities: [firstCapability]
    }, { from: 4, to: 8 })).toEqual({
      sourceAnchors: [anchors[0]],
      sourceCapabilities: [firstCapability]
    });

    expect(sliceQuireInlineSourceProductsToRange({
      ...createBox(),
      sourceAnchors: anchors,
      sourceCapabilities: [firstCapability]
    }, { from: 12, to: 16 })).toEqual({
      sourceAnchors: [anchors[1]],
      sourceCapabilities: []
    });
  });

  it("keeps unclaimed canonical anchors without inventing sidecars", () => {
    expect(sliceQuireInlineSourceProductsToRange({
      ...createBox(),
      sourceAnchors: anchors
    }, { from: 12, to: 16 })).toEqual({
      sourceAnchors: [anchors[1]]
    });
  });

  it("rejects sidecars when canonical source anchors are absent", () => {
    expect(() => sliceQuireInlineSourceProductsToRange({
      ...createBox(),
      sourceCapabilities: [firstCapability]
    }, { from: 0, to: 20 })).toThrowError(
      /capabilities require canonical source anchors/u
    );
  });

  it("filters sidecars by exact logical source identity", () => {
    expect(sliceQuireInlineSourceCapabilitySidecarsToAnchors(
      [firstCapability],
      [anchors[1]!]
    )).toEqual([]);
    expect(filterQuireInlineSourceCapabilitySidecarsBySourceAnchorIds(
      [firstCapability],
      ["source:first"]
    )).toEqual([firstCapability]);
  });
});

/**
 * Creates one canonical logical source anchor.
 *
 * @param id - Stable logical source identity.
 * @param nodeType - Exact document node type.
 * @param from - Inclusive source position.
 * @returns Canonical source anchor fixture.
 */
function createAnchor(
  id: string,
  nodeType: string,
  from: number
): QuireInlineSourceAnchor {
  return {
    id,
    nodeType,
    range: { from, to: from + 1 },
    position: { pos: from, bias: 1 },
    affinity: "before"
  };
}

/**
 * Creates the layout box projected by the fixture.
 *
 * @returns Layout box without source products.
 */
function createBox(): QuireLayoutBox {
  return {
    id: "paragraph",
    range: { from: 0, to: 20 },
    rect: { x: 0, y: 0, width: 200, height: 20 }
  };
}

/**
 * Creates one claimed capability gap keyed by a canonical source anchor.
 *
 * @param sourceAnchorId - Logical source anchor identity.
 * @param nodeType - Exact node type claimed by the View adapter.
 * @returns Typed gap sidecar fixture.
 */
function createGap(
  sourceAnchorId: string,
  nodeType: string
): QuireGapInlineSourceCapabilitySidecar {
  return {
    sourceAnchorId,
    nodeType,
    status: "gap",
    gaps: [{
      code: "invalid-source-declaration",
      nodeType,
      message: `Invalid ${nodeType}.`
    }]
  };
}
