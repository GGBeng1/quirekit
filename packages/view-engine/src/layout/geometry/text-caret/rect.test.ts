import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { buildQuireTextCaretAnchorRect } from "./rect";

const fragment: QuireTextFragment = {
  id: "fragment",
  text: "small",
  range: { from: 1, to: 6 },
  rect: { x: 10, y: 20, width: 40, height: 34 },
  font: "13px sans-serif",
  lineHeight: 34,
  baseline: 46,
  runAscent: 12,
  runDescent: 4,
  caretStops: [
    { position: { pos: 1, bias: 1 }, localX: 0 },
    { position: { pos: 6, bias: -1 }, localX: 40 }
  ]
};

describe("buildQuireTextCaretAnchorRect", () => {
  it("uses the current run's height on a mixed-size line", () => {
    expect(buildQuireTextCaretAnchorRect(
      fragment,
      fragment.caretStops[1]!,
      { x: 0, y: 0, width: 100, height: 100 },
      1
    )).toEqual({
      x: 50,
      y: 34,
      width: 1,
      height: 16
    });
  });
});
