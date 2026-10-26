import type { QuireInlineSourcePlacementDeclaration } from "@quirekit/layout/inline";
import { qkView } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type { QuireBlockFlowExclusion, QuireBlockLayoutInput } from "../block-types";
import type { QuireInlineSourceCapabilitySidecar } from "../inline/source-capability";
import { stabilizeOwnedBlockFlowPlacements } from "./pin";

describe("baseline block-flow placement stabilization", () => {
  it("prevents either movement policy from feeding its own wrap back into placement", () => {
    const input: QuireBlockLayoutInput = {
      id: "paragraph",
      range: { from: 1, to: 4 },
      localFlowExclusions: [
        createExclusion("fixed", 40),
        createExclusion("moving", 80)
      ],
      sourceCapabilities: [
        createCapability("fixed", "fixed-on-page"),
        createCapability("moving", "move-with-text")
      ]
    };

    const result = stabilizeOwnedBlockFlowPlacements(input, 30, [
      createExclusion("fixed", 40),
      createExclusion("moving", 80)
    ]);

    expect(result.localFlowExclusions?.[0]?.rect.y).toBe(10);
    expect(result.localFlowExclusions?.[0]?.geometry).toMatchObject({
      bounds: { y: 10 }
    });
    expect(result.localFlowExclusions?.[1]?.rect.y).toBe(50);
    expect(result.sourceCapabilities?.[0]).toMatchObject({
      placement: {
        blockPlacement: { offset: -30 }
      }
    });
    expect(result.sourceCapabilities?.[1]).toMatchObject({
      placement: {
        blockPlacement: { offset: -30 }
      }
    });
  });
});

/**
 * Creates one rectangle exclusion fixture.
 *
 * @param sourceAnchorId - Logical source identity.
 * @param y - Local block origin.
 * @returns Accepted local flow exclusion.
 */
function createExclusion(sourceAnchorId: string, y: number): QuireBlockFlowExclusion {
  const rect = { x: 10, y, width: 40, height: 20 };
  return {
    sourceAnchorId,
    objectId: sourceAnchorId,
    rect,
    geometry: {
      kind: "rectangle" as const,
      bounds: rect,
      side: "both" as const,
      clearance: {
        blockStart: 0,
        inlineEnd: 0,
        blockEnd: 0,
        inlineStart: 0
      }
    }
  };
}

/**
 * Creates one resolved placement sidecar fixture.
 *
 * @param sourceAnchorId - Logical source identity.
 * @param anchorMovement - Movement policy under test.
 * @returns Resolved source capability.
 */
function createCapability(
  sourceAnchorId: string,
  anchorMovement: QuireInlineSourcePlacementDeclaration["anchorMovement"]
): QuireInlineSourceCapabilitySidecar {
  return {
    sourceAnchorId,
    nodeType: "drawing",
    status: "resolved",
    placement: {
      objectId: sourceAnchorId,
      extent: { inlineSize: 40, blockSize: 20 },
      layoutMode: "anchored",
      anchorMovement,
      inlinePlacement: { kind: "offset", reference: "anchor", offset: 0 },
      blockPlacement: { kind: "offset", reference: "paragraph", offset: 0 },
      flowExclusion: {
        kind: "rectangle",
        side: "both",
        clearance: {
          blockStart: 0,
          inlineEnd: 0,
          blockEnd: 0,
          inlineStart: 0
        }
      },
      paintOrder: "above-content",
      stackingOrder: 0,
      allowOverlap: true,
      constrainToRegion: true,
      lockAspectRatio: false,
      storyId: null
    },
    presentation: {
      view: qkView.surface({ id: sourceAnchorId, width: 40, height: 20 }),
      rootKind: "drawing",
      semanticRole: "embed",
      search: { kind: "excluded", reason: "Movement fixture." },
      exportFallbacks: [{ kind: "semantic-degraded" }]
    }
  };
}
