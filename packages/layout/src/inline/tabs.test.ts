import { describe, expect, it } from "vitest";
import { layoutQuireInlineTextFragmentsFromQuireLayout } from "./quire-fragments";
import { cloneQuireTextFragmentWithLazyCaretStops } from "../text/fragment-lazy-caret-stops";
import { findQuireTextCaretStopAtX } from "../text/fragments";

describe("tab source geometry through pagination", () => {
  it("keeps one source tab, two caret edges and its leader through lazy projection", () => {
    const fragments = layoutQuireInlineTextFragmentsFromQuireLayout({
      id: "contents", runs: [{ text: "Title\t12", range: { from: 1, to: 9 }, font: "16px test", marks: [] }],
      rect: { x: 20, y: 0, width: 200, height: 24 }, lineHeight: 24, textBaselineOffset: 18, lineBreakMode: "word",
      textMeasurer: { measureText: text => ({ width: text.length * 10, ascent: 12, descent: 4 }) },
      tabs: { stops: [{ position: 200, alignment: "end", leader: "." }] }
    });
    expect(fragments.map(fragment => fragment.text).join("")).toBe("Title\t12");
    const tab = fragments.find(fragment => fragment.text === "\t")!;
    expect(tab.rect).toMatchObject({ x: 70, width: 130 });
    expect(tab.caretStops.map(stop => [stop.position.pos, stop.localX])).toEqual([[6, 0], [7, 130]]);
    expect(tab.tab?.text).toMatch(/^\.+$/u);
    const projected = cloneQuireTextFragmentWithLazyCaretStops({
      source: tab, id: "page-2-tab", range: tab.range, baseline: 1042,
      rect: { ...tab.rect, x: tab.rect.x + 100, y: 1024 }
    });
    expect(projected.tab).toEqual(tab.tab);
    expect(findQuireTextCaretStopAtX(projected, projected.rect.x + 10).position.pos).toBe(6);
    expect(findQuireTextCaretStopAtX(projected, projected.rect.x + 120).position.pos).toBe(7);
  });
});
