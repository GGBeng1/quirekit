import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import { describe, expect, it } from "vitest";
import type { QuireInteractionSelectionTarget } from "@quirekit/view-engine";

import {
  createMountedSelectionGeometryContext,
  createMountedSelectionRangeGeometryContext
} from "./context";

describe("mounted selection geometry context", () => {
  it("preserves both endpoint visual contexts for range selections", () => {
    const anchorTarget = createSelectionTarget(10, "cell#p3");
    const headTarget = createSelectionTarget(20, "cell#p5");

    expect(
      createMountedSelectionRangeGeometryContext(anchorTarget, headTarget)
    ).toEqual({
      queryOwner: headTarget.queryOwner,
      referenceRect: headTarget.referenceRect,
      viewRegion: headTarget.region,
      visualContexts: [
        {
          queryOwner: anchorTarget.queryOwner,
          referenceRect: anchorTarget.referenceRect,
          viewRegion: anchorTarget.region
        },
        {
          queryOwner: headTarget.queryOwner,
          referenceRect: headTarget.referenceRect,
          viewRegion: headTarget.region
        }
      ]
    });
  });

  it("keeps the single-target context shape for collapsed selections", () => {
    const target = createSelectionTarget(20, "cell#p5");

    expect(createMountedSelectionGeometryContext(target)).toEqual({
      queryOwner: target.queryOwner,
      referenceRect: target.referenceRect,
      viewRegion: target.region
    });
  });
});

/**
 * Creates an interaction target with retained visual instance identity.
 *
 * @param y - Document-space rectangle y coordinate.
 * @param visualInstanceId - Visual instance represented by the target.
 * @returns Interaction selection target fixture.
 */
function createSelectionTarget(
  y: number,
  visualInstanceId: string
): QuireInteractionSelectionTarget {
  const queryOwner: QuireLayoutQueryProductOwner = {
    sourceRootId: "table-cell:semantic:r0:c0:g0:1",
    sourceFragmentId: `${visualInstanceId}:line`,
    coordinateSpace: "document",
    sourceCoordinateSpace: "table-cell-local",
    region: {
      rootId: { value: "root:table-cell:semantic:r0:c0:g0:1" },
      regionId: { value: "region:table-cell:semantic:r0:c0:g0:1" },
      kind: "table-cell",
      visualInstanceId
    }
  };

  return {
    domain: "text",
    commandTarget: "editable-text",
    hitKind: "position",
    region: queryOwner.region,
    queryOwner,
    referenceRect: { x: 173, y, width: 266, height: 24 }
  };
}
