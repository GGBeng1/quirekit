import { describe, expect, it } from "vitest";
import {
  layoutQuireBlockDocument,
  paginateQuireLayoutDocument
} from "../..";
import type { QuireInlinePlacementGap } from ".";

describe("flow-exclusion placement gaps", () => {
  it("survives retained block layout and page placement recompilation", () => {
    const gap: QuireInlinePlacementGap = {
      code: "flow-exclusion-non-convergence",
      sourceAnchorId: "paragraph:source-1",
      objectId: "drawing-1",
      message: "Flow exclusion did not converge after 4 shaped passes."
    };
    const document = layoutQuireBlockDocument({
      id: "document",
      range: { from: 0, to: 3 },
      rect: { x: 20, y: 30, width: 200, height: 120 },
      blockHeight: 20,
      blockGap: 0,
      children: [{
        id: "paragraph",
        range: { from: 0, to: 3 },
        minHeight: 20,
        flowExclusionGaps: [gap]
      }]
    });

    expect(document.flowExclusionGaps).toEqual([gap]);
    expect(document.anchorPlacementGaps).toEqual([gap]);

    const paginated = paginateQuireLayoutDocument({
      document,
      pageGeometry: {
        pageRect: { x: 0, y: 0, width: 240, height: 180 },
        bodyRect: { x: 20, y: 30, width: 200, height: 120 }
      }
    });

    expect(paginated.flowExclusionGaps).toEqual([gap]);
    expect(paginated.anchorPlacementGaps).toEqual([gap]);
  });
});
