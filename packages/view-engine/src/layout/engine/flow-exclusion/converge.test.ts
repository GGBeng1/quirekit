import { describe, expect, it } from "vitest";
import type { QuireBlockLayoutInput } from "../block-types";
import { reflowQuireBlockFlowChildren } from "./converge";

/**
 * Creates a paragraph input whose fragments count reads.
 * @param id - Stable occurrence id.
 * @param reads - Mutable read counter.
 * @returns Ordinary input without floating-object exclusions.
 */
function paragraph(id: string, reads: { count: number }): QuireBlockLayoutInput {
  return {
    id,
    range: { from: 0, to: 4 },
    get textFragments() {
      reads.count += 1;
      return [];
    }
  };
}

describe("sibling flow exclusion convergence", () => {
  it("returns scopes without exclusions unchanged without reading their fragments", () => {
    const reads = { count: 0 };
    const children = Array.from({ length: 50 }, (_, index) => paragraph(`p-${index}`, reads));
    const section: QuireBlockLayoutInput = { id: "section", range: { from: 0, to: 300 }, children };

    // A long section has no floating objects; its children only move when an
    // earlier one changes height, so no extent pass over every child is needed.
    const result = reflowQuireBlockFlowChildren({ children: [section], width: 300, blockGap: 0 });
    expect(result[0]).toBe(section);
    expect(reads.count).toBe(0);
  });
});
