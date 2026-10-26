import { describe, expect, it } from "vitest";
import type { QuireInlineSourceAnchor } from "./types";
import {
  shiftQuireInlineSourceAnchors,
  sliceQuireInlineSourceAnchorsToRange
} from "./range";

const anchors: readonly QuireInlineSourceAnchor[] = [{
  id: "paragraph:inline-source:4:attachment",
  nodeType: "attachment",
  range: { from: 10, to: 11 },
  position: { pos: 10, bias: 1 },
  affinity: "before"
}, {
  id: "paragraph:inline-source:12:mention",
  nodeType: "mention",
  range: { from: 18, to: 19 },
  position: { pos: 18, bias: 1 },
  affinity: "before"
}];

describe("inline source anchor range projection", () => {
  it("shifts source ranges and positions without changing stable identity", () => {
    expect(shiftQuireInlineSourceAnchors(anchors, 7)).toEqual([{
      ...anchors[0],
      range: { from: 17, to: 18 },
      position: { pos: 17, bias: 1 }
    }, {
      ...anchors[1],
      range: { from: 25, to: 26 },
      position: { pos: 25, bias: 1 }
    }]);
  });

  it("retains only exact source occurrences intersecting a projected range", () => {
    expect(sliceQuireInlineSourceAnchorsToRange(anchors, { from: 11, to: 19 }))
      .toEqual([anchors[1]]);
  });
});
