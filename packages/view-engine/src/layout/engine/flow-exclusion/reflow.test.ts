import { describe, expect, it } from "vitest";
import type { QuireBlockFlowExclusion } from "../block-types";
import { createOwnedActiveExclusions } from "./reflow";

describe("page-owned block flow exclusions", () => {
  it("clips a tall exclusion to the fragment containing its anchor block", () => {
    const [result] = createOwnedActiveExclusions(
      [createExclusion({ x: 30, y: 50, width: 40, height: 100 })],
      20,
      100
    );

    expect(result?.rect).toEqual({ x: 30, y: 70, width: 40, height: 30 });
  });

  it("does not transfer an offset exclusion to the following fragment", () => {
    const result = createOwnedActiveExclusions(
      [createExclusion({ x: 30, y: 110, width: 40, height: 60 })],
      20,
      100
    );

    expect(result).toEqual([]);
  });

  it("does not transfer an upward exclusion to the preceding fragment", () => {
    const [result] = createOwnedActiveExclusions(
      [createExclusion({ x: 30, y: -50, width: 40, height: 90 })],
      130,
      100
    );

    expect(result?.rect).toEqual({ x: 30, y: 100, width: 40, height: 70 });
  });
});

/**
 * Creates one rectangle exclusion in an anchor-owning block's local space.
 *
 * @param rect - Local exclusion geometry.
 * @returns Flow exclusion accepted by the sibling registry.
 */
function createExclusion(
  rect: Readonly<{ x: number; y: number; width: number; height: number }>
): QuireBlockFlowExclusion {
  return {
    sourceAnchorId: "anchor",
    objectId: "object",
    rect,
    geometry: {
      kind: "rectangle",
      bounds: rect,
      side: "both",
      clearance: {
        blockStart: 0,
        inlineEnd: 0,
        blockEnd: 0,
        inlineStart: 0
      }
    }
  };
}
