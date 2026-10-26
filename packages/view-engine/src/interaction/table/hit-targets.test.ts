import { describe, expect, it } from "vitest";
import { findQuireTableHitTargetAtPoint } from "./hit-targets";
import type { QuireTableHitTarget } from "../../layout";

const hitTargets = [
  {
    id: "wordTable-0:hit:semantic:r0:c0:g1:1",
    kind: "cell",
    tableId: "wordTable-0",
    semanticCellId: "semantic:r0:c0:g1:1",
    originExplicitCellId: "cell:r0:c0:g0:1",
    explicitCellIds: ["cell:r0:c0:g0:1"],
    originCellPos: 2,
    range: { from: 2, to: 6 },
    rect: { x: 10, y: 20, width: 150, height: 28 }
  },
  {
    id: "wordTable-0:hit:semantic:r0:c1:g1:1",
    kind: "cell",
    tableId: "wordTable-0",
    semanticCellId: "semantic:r0:c1:g1:1",
    originExplicitCellId: "cell:r0:c1:g1:1",
    explicitCellIds: ["cell:r0:c1:g1:1"],
    originCellPos: 8,
    range: { from: 8, to: 12 },
    rect: { x: 160, y: 20, width: 150, height: 28 }
  }
] satisfies readonly QuireTableHitTarget[];

describe("Quire table hit targets", () => {
  it("finds the first cell hit target containing a point", () => {
    expect(
      findQuireTableHitTargetAtPoint({
        hitTargets,
        point: { x: 20, y: 30 }
      })
    ).toBe(hitTargets[0]);
  });

  it("prefers the smallest page-local cell target when targets overlap", () => {
    const mergedTarget = {
      ...hitTargets[0]!,
      id: "wordTable-0:hit:semantic:r0:c0:g1:1:merged",
      range: { from: 2, to: 20 },
      rect: { x: 10, y: 20, width: 300, height: 96 }
    } satisfies QuireTableHitTarget;
    const rowTarget = {
      ...hitTargets[1]!,
      id: "wordTable-0:hit:semantic:r1:c1:g1:1",
      rect: { x: 160, y: 48, width: 150, height: 24 }
    } satisfies QuireTableHitTarget;

    expect(
      findQuireTableHitTargetAtPoint({
        hitTargets: [mergedTarget, rowTarget],
        point: { x: 170, y: 56 }
      })
    ).toBe(rowTarget);
  });

  it("returns null when no table cell contains a point", () => {
    expect(
      findQuireTableHitTargetAtPoint({
        hitTargets,
        point: { x: 20, y: 80 }
      })
    ).toBeNull();
  });
});
