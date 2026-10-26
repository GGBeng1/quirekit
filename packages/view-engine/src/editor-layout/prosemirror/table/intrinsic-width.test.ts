import { describe, expect, it } from "vitest";
import type { QuireBlockLayoutInput } from "../../../layout/engine/block-types";
import { measureQuireTableCellInlineMetrics } from "./intrinsic-width";

const measurer = {
  measureText: (text: string) => ({ width: text.length * 10 })
};

describe("measureQuireTableCellInlineMetrics", () => {
  it("separates longest unbreakable word from no-wrap line width", () => {
    expect(measureQuireTableCellInlineMetrics([
      textBlock("alpha beta")
    ], measurer)).toEqual({
      minContentWidth: 50,
      maxContentWidth: 100
    });
  });

  it("allows baseline CJK grapheme breaks", () => {
    expect(measureQuireTableCellInlineMetrics([
      textBlock("你好世界")
    ], measurer)).toEqual({
      minContentWidth: 10,
      maxContentWidth: 40
    });
  });

  it("takes maxima across hard lines and nested blocks", () => {
    const parent = textBlock("a\nlong");
    const nested = textBlock("widest-word");
    const input: QuireBlockLayoutInput = { ...parent, children: [nested] };

    expect(measureQuireTableCellInlineMetrics([input], measurer)).toEqual({
      minContentWidth: 70,
      maxContentWidth: 110
    });
  });
});

/**
 * Creates a logical textblock fixture without backend geometry.
 *
 * @param text - Logical text run content.
 * @returns Block input carrying canonical inline runs.
 */
function textBlock(text: string): QuireBlockLayoutInput {
  return {
    id: `block:${text}`,
    range: { from: 0, to: text.length },
    textRuns: [{
      text,
      range: { from: 0, to: text.length },
      font: "16px test",
      marks: []
    }]
  };
}
