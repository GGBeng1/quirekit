import { describe, expect, it } from "vitest";
import { layoutQuireInlineTextFragmentsFromQuireLayout } from "./quire-fragments";

describe("justified paint and caret fragments", () => {
  it("projects distributed last-line characters into the same paint and caret coordinates", () => {
    const fragments = layoutQuireInlineTextFragmentsFromQuireLayout({
      id: "distributed", rect: { x: 100, y: 50, width: 100, height: 100 },
      runs: [{ text: "ABCD", range: { from: 1, to: 5 }, font: "16px test", marks: [] }],
      alignment: "distribute", lineHeight: 24, textBaselineOffset: 18, lineBreakMode: "word",
      textMeasurer: { measureText: text => ({ width: text.length * 10, ascent: 12, descent: 4 }) }
    });
    expect(fragments.map(fragment => fragment.rect.x)).toEqual([100, 130, 160, 190]);
    expect(fragments.map(fragment => fragment.trailingSpacing ?? 0)).toEqual([20, 20, 20, 0]);
    expect(fragments[1]).toMatchObject({ text: "B", caretStops: [
      { position: { pos: 2 }, localX: 0 }, { position: { pos: 3 }, localX: 30 }
    ] });
  });

  it("shares expanded spaces and CJK advances with source caret stops", () => {
    const fragments = layoutQuireInlineTextFragmentsFromQuireLayout({
      id: "justified", rect: { x: 100, y: 50, width: 65, height: 100 },
      runs: [{ text: "aa bb cc", range: { from: 1, to: 9 }, font: "16px test", marks: [] }],
      alignment: "justify", lineHeight: 24, textBaselineOffset: 18, lineBreakMode: "word",
      textMeasurer: { measureText: (text) => ({ width: text.length * 10, ascent: 12, descent: 4 }) }
    });
    const space = fragments.find((fragment) => fragment.range.from === 3);
    expect(space).toMatchObject({ text: " ", trailingSpacing: 15, rect: { x: 120, width: 25 }, caretStops: [
      { position: { pos: 3 }, localX: 0 }, { position: { pos: 4 }, localX: 25 }
    ] });
    expect(fragments.find((fragment) => fragment.range.from === 4)).toMatchObject({ text: "bb", rect: { x: 145, width: 20 } });
    expect(fragments.find((fragment) => fragment.range.from === 6)?.rect.width).toBe(0);
    expect(fragments.at(-1)).toMatchObject({ text: "cc", rect: { x: 100, y: 74, width: 20 } });
  });
});
