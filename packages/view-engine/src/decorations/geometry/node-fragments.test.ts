import { describe, expect, it } from "vitest";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import type { QuireLayoutNode } from "../../layout";
import { findQuireDecorationNodeFragments } from "./node-fragments";

/** @param id - Physical identity. @param from - Source start. @param to - Source end. @param y - Physical top. @returns Retained fragment. */
function fragment(id: string, from: number, to: number, y: number): QuireLayoutNode {
  return { id, kind: "block", range: { from, to }, rect: { x: 30, y, width: 500, height: 50 } };
}

describe("paginated node decoration fragments", () => {
  it("keeps separate page/column fragments and excludes unrelated ancestors, siblings and source geometry", () => {
    const first = { ...fragment("first-page", 11, 25, 100), children: [fragment("nested", 12, 24, 110)] };
    const second = fragment("second-page", 25, 39, 1100);
    const root = { ...fragment("root", 0, 100, 0), children: [
      fragment("before", 1, 10, 0), first, second, fragment("after", 40, 60, 1200),
      { ...fragment("source", 10, 40, 0), interactionRole: "source-geometry" as const }
    ] };
    const snapshot = { root } as unknown as QuireLayoutSnapshot;
    const result = findQuireDecorationNodeFragments(snapshot, { from: 10, to: 40 });
    expect(result).toEqual([first, second]);
    expect(findQuireDecorationNodeFragments(snapshot, { from: 10, to: 40 })).toBe(result);
    expect(findQuireDecorationNodeFragments(snapshot, { from: 70, to: 80 })).toEqual([]);
    expect(findQuireDecorationNodeFragments(snapshot, { from: 12, to: 24 })).toEqual(first.children);
  });
});
