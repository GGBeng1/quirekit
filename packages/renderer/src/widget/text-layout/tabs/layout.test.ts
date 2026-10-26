import { describe, expect, it } from "vitest";
import { layoutQuireText } from "../layout";
import type { QuireTextLayoutOptions } from "../types";

/** @param text - Source text. @returns Deterministic explicit right-tab inputs. */
function options(text: string): QuireTextLayoutOptions {
  return {
    runs: [{ text, font: "16px test" }],
    maxWidth: 200, lineHeight: 24, baselineOffset: 18,
    measureText: (value) => ({ width: value.length * 10, height: 16 }),
    tabs: { stops: [{ position: 200, alignment: "end", leader: "." }] }
  };
}

describe("explicit paragraph tabs", () => {
  it("rejects invalid geometry before wrapping", () => {
    expect(() => layoutQuireText({ ...options("a\t1"), tabs: {
      stops: [{ position: NaN, alignment: "end" }]
    } })).toThrow(RangeError);
  });

  it("shares right-tab advance with clusters and isolates the paint-only leader", () => {
    const layout = layoutQuireText(options("Title\t12"));
    expect(layout.clusters.map((cluster) => cluster.advance)).toEqual([10, 10, 10, 10, 10, 130, 10, 10]);
    expect(layout.clusters.at(-1)?.x).toBe(190);
    const tab = layout.visualRuns.find((run) => run.tab !== undefined)!;
    expect(tab.clusters).toEqual([{ from: 5, to: 6, x: 0, advance: 130 }]);
    expect(tab.tab?.text).toMatch(/^\.+$/u);
    expect(tab.glyphs).toEqual([]);
    expect(layout.visualRuns).toHaveLength(3);
  });

  it("uses replacement extents for derived page numbers across source runs", () => {
    const layout = layoutQuireText({ ...options(""), runs: [
      { text: "Title\t", font: "16px test" },
      { text: "\uFFFC", font: "16px test", replacement: { inlineSize: 30 } }
    ] });
    expect(layout.clusters.at(-1)).toMatchObject({ x: 170, advance: 30 });
  });

  it("recalculates the tab when a short following field must wrap", () => {
    const layout = layoutQuireText(options("abcdefghijklmnopqrs\t12"));
    expect(layout.lines).toHaveLength(2);
    expect(layout.clusters.at(-1)).toMatchObject({ line: 1, x: 190 });
    expect(layout.clusters.find((cluster) => cluster.offset === 19)).toMatchObject({ line: 1, advance: 180 });
  });

  it("keeps logical stops fixed when indentation and flow slots move the line origin", () => {
    const input = options("a\t12");
    const layout = layoutQuireText({ ...input, maxWidth: 160,
      tabs: { ...input.tabs!, offset: 40 }, lineSlots: [[{ x: 20, width: 140 }]] });
    expect(layout.clusters.at(-1)?.x).toBe(150);
  });

  it.each([["start", 100], ["center", 90], ["end", 80]] as const)(
    "positions the following field for %s tabs", (alignment, x) => {
      const layout = layoutQuireText({ ...options("a\t12"), tabs: { stops: [{ position: 100, alignment }] } });
      expect(layout.clusters.find((cluster) => cluster.offset === 2)?.x).toBe(x);
    }
  );

  it("does not merge adjacent tabs or invent source offsets for leaders", () => {
    const layout = layoutQuireText({ ...options("a\t\t12"), tabs: { stops: [
      { position: 80, alignment: "start" }, { position: 200, alignment: "end", leader: "." }
    ] } });
    expect(layout.clusters.map((cluster) => cluster.offset)).toEqual([0, 1, 2, 3, 4]);
    expect(layout.clusters.at(-1)?.x).toBe(190);
  });

  it("keeps tab advances non-negative after indivisible overflowing text", () => {
    const text = "abcdefghijk\u00a0abcdefghijk\tabcdefghijklmnopqrstuv";
    const layout = layoutQuireText({ ...options(text), tabs: {
      stops: [{ position: 400, alignment: "end", leader: "." }]
    } });
    expect(layout.clusters.every(cluster => cluster.advance >= 0)).toBe(true);
    expect(layout.clusters.find(cluster => cluster.offset === 23)?.advance).toBe(0);
  });
});
