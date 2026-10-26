import { describe, expect, it, vi } from "vitest";
import { layoutQuireText } from "./layout";
import type { QuireTextLayoutOptions, QuireTextRun } from "./types";

/** Deterministic measurer where each code unit is 10 wide and 16 tall. */
const measureText: QuireTextLayoutOptions["measureText"] = (text) => ({
  width: text.length * 10,
  height: 16
});

/**
 * Builds layout options around one font run and a wrap width.
 *
 * @param text - Text to lay out as a single run.
 * @param maxWidth - Wrap width.
 * @returns Layout options.
 */
function options(text: string, maxWidth: number): QuireTextLayoutOptions {
  return runOptions([{ text, font: "16px test" }], maxWidth);
}

/**
 * Builds layout options around explicit styled runs and a wrap width.
 *
 * @param runs - Styled runs to lay out.
 * @param maxWidth - Wrap width.
 * @returns Layout options.
 */
function runOptions(runs: readonly QuireTextRun[], maxWidth: number): QuireTextLayoutOptions {
  return { runs, maxWidth, lineHeight: 24, baselineOffset: 18, measureText };
}

describe("layoutQuireText", () => {
  it("retains explicit and empty lines without soft wrapping fitted text", () => {
    const layout = layoutQuireText({
      ...options("内部资料\n\nA B", 30),
      wrapMode: "none",
      alignment: "center"
    });
    expect(layout.lines.map(line => [line.start.offset, line.end.offset])).toEqual([[0, 4], [5, 5], [6, 9]]);
    expect(layout.lines.map(line => line.rect.width)).toEqual([40, 0, 30]);
    expect(layout.lines[0]?.rect.x).toBe(0);
    expect(layout.lines[2]?.rect.x).toBe(0);
  });

  it("adds signed spacing to every grapheme for wrap and caret geometry", () => {
    const shapeText = vi.fn(() => ({
      clusters: [{ offset: 0, length: 3, advance: 24 }],
      glyphs: []
    }));
    const spaced = layoutQuireText({
      ...runOptions([{ text: "abc", font: "16px test", letterSpacing: 2 }], 24),
      wrapMode: "anywhere",
      shapeText
    });

    expect(shapeText).not.toHaveBeenCalled();
    expect(spaced.lines).toHaveLength(2);
    expect(spaced.lines.map((line) => line.rect.width)).toEqual([24, 12]);
    expect(spaced.clusters.map((cluster) => cluster.advance)).toEqual([12, 12, 12]);

    const compressed = layoutQuireText({
      ...runOptions([{ text: "ab", font: "16px test", letterSpacing: -15 }], 100),
      wrapMode: "anywhere"
    });
    expect(compressed.clusters.map((cluster) => cluster.advance)).toEqual([0, 0]);
    expect(compressed.lines[0]?.rect.width).toBe(0);
  });

  it("allows an explicit shaping predicate to preserve tracked run semantics", () => {
    const shapeText = vi.fn((text: string) => ({
      clusters: Array.from(text).map((_, index) => ({
        offset: index,
        length: 1,
        advance: 10
      })),
      glyphs: []
    }));
    const layout = layoutQuireText({
      ...runOptions([{
        text: "abc",
        font: "16px test",
        letterSpacing: 2
      }], 100),
      shapeText,
      shouldShapeRun: () => true
    });

    expect(shapeText).toHaveBeenCalledOnce();
    expect(layout.clusters.map((cluster) => cluster.advance)).toEqual([12, 12, 12]);
  });

  it("grows the line around shifted run metrics without changing advances", () => {
    const superscript = layoutQuireText(runOptions([{
      text: "x",
      font: "10px test",
      ascent: 7,
      descent: 2,
      baselineShift: 20
    }], 100));
    const subscript = layoutQuireText(runOptions([{
      text: "x",
      font: "10px test",
      ascent: 7,
      descent: 2,
      baselineShift: -10
    }], 100));

    expect(superscript.lines[0]).toMatchObject({
      rect: { width: 10, height: 33 },
      baselineOffset: 27
    });
    expect(superscript.visualRuns[0]).toMatchObject({ ascent: 7, descent: 2 });
    expect(subscript.lines[0]).toMatchObject({
      rect: { width: 10, height: 30 },
      baselineOffset: 18
    });
    expect(subscript.visualRuns[0]).toMatchObject({ ascent: 7, descent: 2 });
  });

  it("lays out an atomic inline replacement without measuring or shaping its placeholder", () => {
    let measuredPlaceholder = false;
    let shapedPlaceholder = false;
    const layout = layoutQuireText({
      runs: [
        { text: "a", font: "16px test" },
        {
          text: "\ufffc",
          font: "16px test",
          ascent: 36,
          descent: 0,
          replacement: { inlineSize: 42 }
        },
        { text: "b", font: "16px test" }
      ],
      maxWidth: 62,
      lineHeight: 24,
      baselineOffset: 18,
      measureText(text) {
        measuredPlaceholder = measuredPlaceholder || text.includes("\ufffc");
        return { width: text.length * 10, height: 16 };
      },
      shapeText(text) {
        shapedPlaceholder = shapedPlaceholder || text.includes("\ufffc");
        return {
          clusters: Array.from(text).map((_, index) => ({
            offset: index,
            length: 1,
            advance: 10
          })),
          glyphs: []
        };
      }
    });

    expect(measuredPlaceholder).toBe(false);
    expect(shapedPlaceholder).toBe(false);
    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0]?.rect).toEqual({ x: 0, y: 0, width: 62, height: 42 });
    expect(layout.clusters.map((cluster) => cluster.advance)).toEqual([10, 42, 10]);
  });

  it("quantizes a minimum line after oversized inline content grows it", () => {
    const run = {
      text: "\ufffc",
      font: "16px test",
      ascent: 88.45,
      descent: 0,
      replacement: { inlineSize: 42 }
    } as const;
    const natural = layoutQuireText({
      runs: [run],
      maxWidth: 100,
      lineHeight: 21.2,
      lineHeightMode: "minimum",
      baselineOffset: 15.55,
      measureText
    });
    const quantized = layoutQuireText({
      runs: [run],
      maxWidth: 100,
      lineHeight: 21.2,
      lineHeightMode: "minimum",
      lineHeightStep: 21.2,
      baselineOffset: 15.55,
      measureText
    });

    expect(natural.lines[0]).toMatchObject({
      rect: { height: 94.1 },
      baselineOffset: 88.45
    });
    expect(quantized.lines[0]).toMatchObject({
      rect: { height: 106 },
      baselineOffset: 88.45
    });
    expect(quantized.size.height).toBe(106);
  });

  it("lays out a single line with per-cluster geometry", () => {
    const layout = layoutQuireText(options("abc", 1000));

    expect(layout.size).toEqual({ width: 30, height: 24 });
    expect(layout.lines).toEqual([
      {
        rect: { x: 0, y: 0, width: 30, height: 24 },
        baselineOffset: 18,
        clusterStart: 0,
        clusterEnd: 3,
        start: { run: 0, offset: 0 },
        end: { run: 0, offset: 3 }
      }
    ]);
    expect(layout.clusters).toEqual([
      { run: 0, offset: 0, length: 1, x: 0, advance: 10, line: 0 },
      { run: 0, offset: 1, length: 1, x: 10, advance: 10, line: 0 },
      { run: 0, offset: 2, length: 1, x: 20, advance: 10, line: 0 }
    ]);
  });

  it("aligns occupied line geometry inside the available inline slot", () => {
    const centered = layoutQuireText({
      ...options("abc", 100),
      alignment: "center"
    });
    const ended = layoutQuireText({
      ...options("abc", 100),
      alignment: "end",
      baseDirection: "ltr"
    });

    expect(centered.lines[0]?.rect).toEqual({
      x: 35,
      y: 0,
      width: 30,
      height: 24
    });
    expect(centered.clusters.map((cluster) => cluster.x)).toEqual([35, 45, 55]);
    expect(ended.lines[0]?.rect.x).toBe(70);
    expect(ended.clusters.map((cluster) => cluster.x)).toEqual([70, 80, 90]);
  });

  it("resolves logical start and end against right-to-left paragraph direction", () => {
    const started = layoutQuireText({
      ...options("abc", 100),
      alignment: "start",
      baseDirection: "rtl"
    });
    const ended = layoutQuireText({
      ...options("abc", 100),
      alignment: "end",
      baseDirection: "rtl"
    });

    expect(started.lines[0]?.rect.x).toBe(70);
    expect(started.clusters.map((cluster) => cluster.x)).toEqual([70, 80, 90]);
    expect(ended.lines[0]?.rect.x).toBe(0);
    expect(ended.clusters.map((cluster) => cluster.x)).toEqual([0, 10, 20]);
  });

  it("takes per-cluster advances from the shaper for runs that need shaping", () => {
    // A cursive script's joined advances cannot come from cumulative measureText;
    // the shaper supplies them per source offset (7, 8, 9 here, not 10, 10, 10).
    const shapeText: QuireTextLayoutOptions["shapeText"] = (text) => ({
      clusters: Array.from(text).map((_, index) => ({ offset: index, length: 1, advance: 7 + index })),
      glyphs: []
    });

    const layout = layoutQuireText({
      runs: [{ text: "אבג", font: "16px test" }],
      maxWidth: 1000,
      lineHeight: 24,
      baselineOffset: 18,
      baseDirection: "rtl",
      measureText,
      shapeText
    });

    const advanceByOffset = Object.fromEntries(
      layout.clusters.map((cluster) => [cluster.offset, cluster.advance])
    );
    expect(advanceByOffset).toEqual({ 0: 7, 1: 8, 2: 9 });
  });

  it("itemizes a mixed-direction run and shapes each direction segment alone", () => {
    // A run that mixes scripts/directions must be split before shaping, so the
    // shaper never guesses one direction for the whole buffer (which would break
    // joining and boundary advances). "aאb" is L, R(Hebrew), L → three segments.
    const calls: string[] = [];
    const shapeText: QuireTextLayoutOptions["shapeText"] = (text) => {
      calls.push(text);
      return {
        clusters: Array.from(text).map((_, index) => ({ offset: index, length: 1, advance: 5 })),
        glyphs: []
      };
    };

    const layout = layoutQuireText({
      runs: [{ text: "aאb", font: "16px test" }],
      maxWidth: 1000,
      lineHeight: 24,
      baselineOffset: 18,
      baseDirection: "ltr",
      measureText,
      shapeText
    });

    expect(calls).toEqual(["a", "א", "b"]);
    expect(layout.clusters.map((cluster) => cluster.advance)).toEqual([5, 5, 5]);
  });

  it("takes left-to-right run advances from the shaper (single geometry source)", () => {
    // Glyph-run is the production paint path; cluster advances come from the shaper
    // for every script, so caret/selection align with the painted glyphs and the
    // per-grapheme measureText cumulative-prefix scan is avoided.
    let shaped = 0;
    const shapeText: QuireTextLayoutOptions["shapeText"] = (text) => {
      shaped += 1;
      return {
        clusters: Array.from(text).map((_, index) => ({ offset: index, length: 1, advance: 99 })),
        glyphs: []
      };
    };

    const layout = layoutQuireText({
      runs: [{ text: "abc", font: "16px test" }],
      maxWidth: 1000,
      lineHeight: 24,
      baselineOffset: 18,
      measureText,
      shapeText
    });

    expect(shaped).toBe(1);
    expect(layout.clusters.map((cluster) => cluster.advance)).toEqual([99, 99, 99]);
  });

  it("honors a per-run shaping predicate", () => {
    const shapedTexts: string[] = [];
    const shapeText: QuireTextLayoutOptions["shapeText"] = (text) => {
      shapedTexts.push(text);
      return {
        clusters: Array.from(text).map((_, index) => ({ offset: index, length: 1, advance: 5 })),
        glyphs: []
      };
    };

    const layout = layoutQuireText({
      runs: [
        { text: "ab", font: "16px test" },
        { text: "cd", font: "16px test" }
      ],
      maxWidth: 1000,
      lineHeight: 24,
      baselineOffset: 18,
      measureText,
      shapeText,
      shouldShapeRun: (_run, index) => index === 1
    });

    expect(shapedTexts).toEqual(["cd"]);
    expect(layout.clusters.map((cluster) => cluster.advance)).toEqual([10, 10, 5, 5]);
  });

  it("can measure unshaped native advances per grapheme for long-text callers", () => {
    const measured: string[] = [];
    const layout = layoutQuireText({
      runs: [{ text: "ababa", font: "16px test" }],
      maxWidth: 1000,
      lineHeight: 24,
      baselineOffset: 18,
      nativeAdvanceMode: "grapheme",
      measureText: (text) => {
        measured.push(text);
        return { width: text.length * 10, height: 16 };
      }
    });

    expect(measured).toEqual(["ababa", "a", "b"]);
    expect(layout.clusters.map((cluster) => cluster.advance)).toEqual([10, 10, 10, 10, 10]);
  });

  it("wraps at the last whitespace before the width is exceeded", () => {
    const layout = layoutQuireText(options("ab cd", 40));

    expect(layout.lines.map((line) => line.rect)).toEqual([
      { x: 0, y: 0, width: 30, height: 24 },
      { x: 0, y: 24, width: 20, height: 24 }
    ]);
    expect(layout.size).toEqual({ width: 30, height: 48 });
    // "d" is on the second line, keyed by its source offset.
    expect(layout.clusters.at(-1)).toEqual({ run: 0, offset: 4, length: 1, x: 10, advance: 10, line: 1 });
  });

  it("advances through multiple inline slots before starting the next visual row", () => {
    const layout = layoutQuireText({
      ...options("aa bb cc dd", 100),
      lineSlots: [[
        { x: 0, width: 30 },
        { x: 70, width: 30 }
      ]]
    });

    expect(layout.lines).toHaveLength(2);
    expect(layout.lines[0]).toMatchObject({
      rect: { x: 0, y: 0, width: 100, height: 24 },
      clusterStart: 0,
      clusterEnd: 6,
      fragments: [{
        rect: { x: 0, y: 0, width: 30, height: 24 },
        clusterStart: 0,
        clusterEnd: 3
      }, {
        rect: { x: 70, y: 0, width: 30, height: 24 },
        clusterStart: 3,
        clusterEnd: 6
      }]
    });
    expect(layout.clusters.filter((cluster) => cluster.line === 0).map((cluster) => [
      cluster.offset,
      cluster.x
    ])).toEqual([
      [0, 0], [1, 10], [2, 20],
      [3, 70], [4, 80], [5, 90]
    ]);
    expect(layout.lines[1]!.start).toEqual({ run: 0, offset: 6 });
  });

  it("retains a fully blocked visual row as one empty pagination opportunity", () => {
    const layout = layoutQuireText({
      ...options("ab", 100),
      lineSlots: [[], [{ x: 40, width: 20 }]]
    });

    expect(layout.lines).toHaveLength(2);
    expect(layout.lines[0]).toMatchObject({
      rect: { x: 0, y: 0, width: 0, height: 24 },
      fragments: [],
      start: { run: 0, offset: 0 },
      end: { run: 0, offset: 0 }
    });
    expect(layout.lines[1]).toMatchObject({
      rect: { x: 40, y: 24, width: 20, height: 24 },
      fragments: [{
        rect: { x: 40, y: 24, width: 20, height: 24 },
        clusterStart: 0,
        clusterEnd: 2
      }]
    });
    expect(layout.clusters.map((cluster) => cluster.x)).toEqual([40, 50]);
  });

  it("consumes right-to-left row slots in logical inline progression", () => {
    const layout = layoutQuireText({
      ...options("אב גד", 100),
      baseDirection: "rtl",
      lineSlots: [[
        { x: 0, width: 20 },
        { x: 70, width: 30 }
      ]]
    });

    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0]!.fragments?.map((fragment) => fragment.rect)).toEqual([
      { x: 70, y: 0, width: 30, height: 24 },
      { x: 0, y: 0, width: 20, height: 24 }
    ]);
    expect(layout.clusters.map((cluster) => [cluster.offset, cluster.x])).toEqual([
      [0, 90], [1, 80], [2, 70], [3, 10], [4, 0]
    ]);
  });

  it("rejects overlapping inline slots instead of creating ambiguous geometry", () => {
    expect(() => layoutQuireText({
      ...options("ab", 100),
      lineSlots: [[
        { x: 0, width: 60 },
        { x: 50, width: 30 }
      ]]
    })).toThrowError("Text line slots on row 0 must not overlap.");
  });

  it("rejects non-finite measured widths before wrapping can stop making progress", () => {
    expect(() => layoutQuireText({
      ...options("ab", 100),
      measureText: () => ({ width: Number.NaN, height: 16 })
    })).toThrowError(
      "Text break unit advance must be a non-negative finite number."
    );
  });

  it("breaks a single word wider than the line at grapheme boundaries", () => {
    const layout = layoutQuireText(options("abcdef", 35));

    expect(layout.lines).toHaveLength(2);
    expect(layout.clusters.filter((c) => c.line === 1).map((c) => c.offset)).toEqual([3, 4, 5]);
  });

  it("honors hard breaks and anchors the post-break line after the newline", () => {
    const layout = layoutQuireText(options("a\nb", 1000));

    expect(layout.lines).toHaveLength(2);
    expect(layout.clusters).toEqual([
      { run: 0, offset: 0, length: 1, x: 0, advance: 10, line: 0 },
      { run: 0, offset: 2, length: 1, x: 0, advance: 10, line: 1 }
    ]);
    expect(layout.lines[1]!.start).toEqual({ run: 0, offset: 2 });
  });

  it("produces one empty line for empty text so a caret has a line", () => {
    const layout = layoutQuireText(options("", 1000));

    expect(layout.clusters).toEqual([]);
    expect(layout.lines).toEqual([
      {
        rect: { x: 0, y: 0, width: 0, height: 24 },
        baselineOffset: 18,
        clusterStart: 0,
        clusterEnd: 0,
        start: { run: 0, offset: 0 },
        end: { run: 0, offset: 0 }
      }
    ]);
    expect(layout.size).toEqual({ width: 0, height: 24 });
  });

  it("gives every line an anchor range, including an empty line between breaks", () => {
    const layout = layoutQuireText(options("a\n\nb", 1000));

    expect(layout.lines.map((line) => [line.start, line.end])).toEqual([
      [{ run: 0, offset: 0 }, { run: 0, offset: 1 }],
      [{ run: 0, offset: 2 }, { run: 0, offset: 2 }],
      [{ run: 0, offset: 3 }, { run: 0, offset: 4 }]
    ]);
  });

  it("lays out multiple runs on one line, keying clusters by run and offset-in-run", () => {
    const layout = layoutQuireText(
      runOptions([{ text: "ab", font: "16px a" }, { text: "cd", font: "16px b" }], 1000)
    );

    expect(layout.size).toEqual({ width: 40, height: 24 });
    expect(layout.clusters).toEqual([
      { run: 0, offset: 0, length: 1, x: 0, advance: 10, line: 0 },
      { run: 0, offset: 1, length: 1, x: 10, advance: 10, line: 0 },
      { run: 1, offset: 0, length: 1, x: 20, advance: 10, line: 0 },
      { run: 1, offset: 1, length: 1, x: 30, advance: 10, line: 0 }
    ]);
  });

  it("wraps across a run boundary, resetting offsets per run on the new line", () => {
    const layout = layoutQuireText(
      runOptions([{ text: "ab ", font: "16px a" }, { text: "cd", font: "16px b" }], 40)
    );

    expect(layout.lines).toHaveLength(2);
    expect(layout.clusters.filter((c) => c.line === 1)).toEqual([
      { run: 1, offset: 0, length: 1, x: 0, advance: 10, line: 1 },
      { run: 1, offset: 1, length: 1, x: 10, advance: 10, line: 1 }
    ]);
    expect(layout.lines[1]!.start).toEqual({ run: 1, offset: 0 });
  });

  it("keeps NBSP-glued text on one line even when it overflows", () => {
    const nbsp = String.fromCharCode(0x00a0);
    const layout = layoutQuireText(options(`aa${nbsp}bb`, 30));

    expect(layout.lines).toHaveLength(1);
    expect(layout.size).toEqual({ width: 50, height: 24 });
  });

  it("breaks after an ordinary hyphen", () => {
    const layout = layoutQuireText(options("aa-bb", 40));

    expect(layout.lines.map((line) => [line.start.offset, line.end.offset])).toEqual([
      [0, 3],
      [3, 5]
    ]);
  });

  it("breaks CJK text between grapheme clusters", () => {
    const layout = layoutQuireText(options("你好世界", 20));

    expect(layout.lines.map((line) => line.clusterEnd - line.clusterStart)).toEqual([2, 2]);
    expect(layout.clusters.filter((c) => c.line === 1).map((c) => c.offset)).toEqual([2, 3]);
  });

  it("preserves consecutive spaces between words, advancing every offset", () => {
    const layout = layoutQuireText(options("a   b", 1000));

    // Editable text never collapses typed spaces: each advances and keeps a cluster.
    expect(layout.size.width).toBe(50); // a + three spaces + b
    expect(layout.clusters.map((cluster) => cluster.offset)).toEqual([0, 1, 2, 3, 4]);
    expect(layout.clusters.map((cluster) => cluster.advance)).toEqual([10, 10, 10, 10, 10]);
  });

  it("preserves leading, internal, and trailing spaces alike", () => {
    const layout = layoutQuireText(options("  ab  ", 1000));

    // Leading, internal, and trailing spaces are all real content and advance.
    expect(layout.clusters.map((cluster) => cluster.advance)).toEqual([10, 10, 10, 10, 10, 10]);
    expect(layout.size.width).toBe(60);
  });

  it("preserves every space in an all-whitespace paragraph", () => {
    const layout = layoutQuireText(options("   ", 1000));

    expect(layout.clusters.map((cluster) => cluster.advance)).toEqual([10, 10, 10]);
    expect(layout.size.width).toBe(30);
  });

  it("keeps a newline as a hard break", () => {
    expect(layoutQuireText(options("a\nb", 1000)).lines).toHaveLength(2);
  });

  it("grows a line box to its tallest run's ascent and descent", () => {
    const layout = layoutQuireText(
      runOptions([
        { text: "a", font: "16px a" },
        { text: "B", font: "28px a", ascent: 26, descent: 8 }
      ], 1000)
    );

    // Strut is 18/6 (baseline 18, height 24); the tall run lifts it to 26/8.
    expect(layout.lines[0]!.rect.height).toBe(34);
    expect(layout.lines[0]!.baselineOffset).toBe(26);
    expect(layout.size.height).toBe(34);
    expect(layout.visualRuns).toEqual([
      expect.objectContaining({ run: 0, ascent: 18, descent: 6 }),
      expect.objectContaining({ run: 1, ascent: 26, descent: 8 })
    ]);
  });

  it("grows a line box from shaped run ascent and descent", () => {
    const layout = layoutQuireText({
      runs: [{ text: "A", font: "28px shaped" }],
      maxWidth: 1000,
      lineHeight: 24,
      baselineOffset: 18,
      measureText,
      shapeText: (text) => ({
        clusters: Array.from(text).map((_, index) => ({
          offset: index,
          length: 1,
          advance: 12
        })),
        ascent: 26,
        descent: 8,
        glyphs: []
      })
    });

    expect(layout.lines[0]!.rect.height).toBe(34);
    expect(layout.lines[0]!.baselineOffset).toBe(26);
    expect(layout.visualRuns[0]).toEqual(
      expect.objectContaining({ ascent: 26, descent: 8 })
    );
  });

  it("keeps an exact paragraph line box fixed around oversized runs", () => {
    const layout = layoutQuireText({
      ...runOptions([
        { text: "A", font: "28px a", ascent: 26, descent: 8 }
      ], 1000),
      lineHeightMode: "exact"
    });

    expect(layout.lines[0]!.rect.height).toBe(24);
    expect(layout.lines[0]!.baselineOffset).toBe(18);
    expect(layout.size.height).toBe(24);
    expect(layout.visualRuns[0]).toEqual(
      expect.objectContaining({ ascent: 26, descent: 8 })
    );
  });

  it("stacks lines by their own heights when they differ", () => {
    const layout = layoutQuireText(
      runOptions([
        { text: "A\n", font: "28px a", ascent: 26, descent: 8 },
        { text: "b", font: "16px a" }
      ], 1000)
    );

    expect(layout.lines.map((line) => [line.rect.y, line.rect.height])).toEqual([
      [0, 34],
      [34, 24]
    ]);
    expect(layout.size.height).toBe(58);
  });

  it("applies paragraph-end metrics only to the final visual line", () => {
    const layout = layoutQuireText({
      ...options("a\nb", 1000),
      finalLineMetricContribution: { ascent: 30, descent: 10 }
    });

    expect(layout.lines.map((line) => ({
      y: line.rect.y,
      height: line.rect.height,
      baselineOffset: line.baselineOffset
    }))).toEqual([
      { y: 0, height: 24, baselineOffset: 18 },
      { y: 24, height: 40, baselineOffset: 30 }
    ]);
    expect(layout.size.height).toBe(64);
  });

  it("applies an external ascent to one line without inventing marker descent", () => {
    const layout = layoutQuireText({
      ...options("a\nb", 1000),
      lineMetricContributions: [{ ascent: 30 }]
    });

    expect(layout.lines.map((line) => ({
      y: line.rect.y,
      height: line.rect.height,
      baseline: line.baselineOffset
    }))).toEqual([
      { y: 0, height: 36, baseline: 30 },
      { y: 36, height: 24, baseline: 18 }
    ]);
    expect(layout.size.height).toBe(60);
  });

  it("lays out a pure right-to-left run right-to-left with visual x and levels", () => {
    const layout = layoutQuireText({ ...options("אבג", 1000), baseDirection: "rtl" });

    // The first logical char sits furthest right; all clusters get level 1.
    expect(layout.clusters.map((cluster) => [cluster.offset, cluster.x, cluster.level])).toEqual([
      [0, 20, 1],
      [1, 10, 1],
      [2, 0, 1]
    ]);
  });

  it("honors an explicit RTL run even when the paragraph direction is omitted", () => {
    const layout = layoutQuireText(runOptions([{
      text: "אבג",
      font: "16px test",
      direction: "rtl"
    }], 1000));

    expect(layout.clusters.map((cluster) => [
      cluster.offset,
      cluster.x,
      cluster.level
    ])).toEqual([
      [0, 20, 1],
      [1, 10, 1],
      [2, 0, 1]
    ]);
  });

  it("orders a mixed left-to-right and right-to-left line visually", () => {
    const layout = layoutQuireText({ ...options("abאב", 1000), baseDirection: "ltr" });

    // "ab" stays left-to-right; the Hebrew pair reverses after it.
    expect(layout.clusters.map((cluster) => [cluster.offset, cluster.x])).toEqual([
      [0, 0],
      [1, 10],
      [2, 30],
      [3, 20]
    ]);
  });

  it("breaks between any graphemes in anywhere wrap mode", () => {
    const layout = layoutQuireText({ ...options("aa bcde", 40), wrapMode: "anywhere" });

    // Word mode would keep "bcde" whole; anywhere fills the first line mid-word.
    expect(layout.lines.map((line) => [line.start.offset, line.end.offset])).toEqual([
      [0, 4],
      [4, 7]
    ]);
  });

  describe("visual runs (single geometry source)", () => {
    // A fake shaper: 10-wide clusters, one glyph per char in RTL visual order
    // (HarfBuzz emits an RTL buffer leftmost-first), so the leftmost glyph is the
    // logically-last character. glyph.x is relative to the shaped segment origin.
    const rtlShaper: QuireTextLayoutOptions["shapeText"] = (text) => {
      const chars = [...text];
      const count = chars.length;
      return {
        clusters: chars.map((_, index) => ({ offset: index, length: 1, advance: 10 })),
        glyphs: chars.map((_, visualIndex) => {
          const logical = count - 1 - visualIndex;
          return {
            glyphId: 1000 + logical,
            cluster: logical,
            x: visualIndex * 10,
            y: 0,
            xAdvance: 10,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0
          };
        }),
        glyphCoverage: "complete"
      };
    };

    it("emits one left-to-right visual run per line with run-local cluster x and no glyphs without a shaper", () => {
      const layout = layoutQuireText(options("abc", 1000));

      expect(layout.visualRuns).toEqual([
        {
          line: 0,
          run: 0,
          direction: "ltr",
          x: 0,
          clusters: [
            { from: 0, to: 1, x: 0, advance: 10 },
            { from: 1, to: 2, x: 10, advance: 10 },
            { from: 2, to: 3, x: 20, advance: 10 }
          ],
          codepoints: [],
          glyphs: []
        }
      ]);
    });

    it("splits a mixed bidi line into visual runs ordered left-to-right, each run's clusters run-local in visual order", () => {
      const layout = layoutQuireText({ ...options("abאב", 1000), baseDirection: "ltr" });

      expect(layout.visualRuns).toEqual([
        {
          line: 0,
          run: 0,
          direction: "ltr",
          x: 0,
          clusters: [
            { from: 0, to: 1, x: 0, advance: 10 },
            { from: 1, to: 2, x: 10, advance: 10 }
          ],
          codepoints: [],
          glyphs: []
        },
        {
          line: 0,
          run: 0,
          direction: "rtl",
          x: 20,
          clusters: [
            { from: 3, to: 4, x: 0, advance: 10 },
            { from: 2, to: 3, x: 10, advance: 10 }
          ],
          codepoints: [],
          glyphs: []
        }
      ]);
    });

    it("carries positioned glyphs per visual run for a shaped right-to-left run", () => {
      const layout = layoutQuireText({
        ...options("אבג", 1000),
        baseDirection: "rtl",
        shapeText: rtlShaper
      });

      expect(layout.visualRuns).toEqual([
        {
          line: 0,
          run: 0,
          direction: "rtl",
          x: 0,
          glyphCoverage: "complete",
          clusters: [
            { from: 2, to: 3, x: 0, advance: 10 },
            { from: 1, to: 2, x: 10, advance: 10 },
            { from: 0, to: 1, x: 20, advance: 10 }
          ],
          codepoints: [],
          glyphs: [
            { glyphId: 1002, cluster: 2, x: 0, y: 0, xAdvance: 10, yAdvance: 0, xOffset: 0, yOffset: 0 },
            { glyphId: 1001, cluster: 1, x: 10, y: 0, xAdvance: 10, yAdvance: 0, xOffset: 0, yOffset: 0 },
            { glyphId: 1000, cluster: 0, x: 20, y: 0, xAdvance: 10, yAdvance: 0, xOffset: 0, yOffset: 0 }
          ]
        }
      ]);
    });

    it("carries full glyph placement fields and per-glyph font identity from the shaper", () => {
      // A fallback font shaped the single right-to-left cluster; all HarfBuzz
      // placement fields (offsets, advances, font identity) must survive into the
      // visual run unchanged, with only x rebased to the run origin.
      const fallbackShaper: QuireTextLayoutOptions["shapeText"] = () => ({
        clusters: [{ offset: 0, length: 1, advance: 12 }],
        glyphs: [
          {
            glyphId: 42,
            cluster: 0,
            x: 0,
            y: -1,
            xAdvance: 12,
            yAdvance: 0,
            xOffset: 2,
            yOffset: -3,
            fontId: "noto-arabic",
            fontFamily: "Noto Sans Arabic"
          }
        ],
        glyphCoverage: "complete"
      });

      const layout = layoutQuireText({
        ...options("א", 1000),
        baseDirection: "rtl",
        shapeText: fallbackShaper
      });

      expect(layout.visualRuns).toEqual([
        {
          line: 0,
          run: 0,
          direction: "rtl",
          x: 0,
          glyphCoverage: "complete",
          clusters: [{ from: 0, to: 1, x: 0, advance: 12 }],
          codepoints: [],
          glyphs: [
            {
              glyphId: 42,
              cluster: 0,
              x: 0,
              y: -1,
              xAdvance: 12,
              yAdvance: 0,
              xOffset: 2,
              yOffset: -3,
              fontId: "noto-arabic",
              fontFamily: "Noto Sans Arabic"
            }
          ]
        }
      ]);
    });

    it("splits partial glyph coverage at visual-run boundaries before consumers build fragments", () => {
      const mixedCoverageShaper: QuireTextLayoutOptions["shapeText"] = () => ({
        clusters: [
          { offset: 0, length: 1, advance: 11 },
          { offset: 1, length: 1, advance: 20 },
          { offset: 2, length: 1, advance: 13 }
        ],
        glyphs: [
          {
            glyphId: 65,
            cluster: 0,
            x: 0,
            y: 0,
            xAdvance: 11,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0,
            fontId: "latin",
            fontFamily: "Latin Fixture"
          },
          {
            glyphId: 66,
            cluster: 2,
            x: 31,
            y: 0,
            xAdvance: 13,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0,
            fontId: "latin",
            fontFamily: "Latin Fixture"
          }
        ],
        glyphCoverage: "partial"
      });

      const layout = layoutQuireText({
        ...options("A你B", 1000),
        shapeText: mixedCoverageShaper
      });

      expect(layout.visualRuns).toEqual([
        {
          line: 0,
          run: 0,
          direction: "ltr",
          x: 0,
          glyphCoverage: "complete",
          clusters: [{ from: 0, to: 1, x: 0, advance: 11 }],
          codepoints: [],
          glyphs: [
            {
              glyphId: 65,
              cluster: 0,
              x: 0,
              y: 0,
              xAdvance: 11,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0,
              fontId: "latin",
              fontFamily: "Latin Fixture"
            }
          ]
        },
        {
          line: 0,
          run: 0,
          direction: "ltr",
          x: 11,
          clusters: [{ from: 1, to: 2, x: 0, advance: 20 }],
          codepoints: [],
          glyphs: []
        },
        {
          line: 0,
          run: 0,
          direction: "ltr",
          x: 31,
          glyphCoverage: "complete",
          clusters: [{ from: 2, to: 3, x: 0, advance: 13 }],
          codepoints: [],
          glyphs: [
            {
              glyphId: 66,
              cluster: 2,
              x: 0,
              y: 0,
              xAdvance: 13,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0,
              fontId: "latin",
              fontFamily: "Latin Fixture"
            }
          ]
        }
      ]);
    });

    it("keeps wrapped Latin visual runs complete when another line makes the source run partial", () => {
      const mixedCoverageShaper: QuireTextLayoutOptions["shapeText"] = () => ({
        clusters: [
          { offset: 0, length: 1, advance: 20 },
          { offset: 1, length: 1, advance: 11 },
          { offset: 2, length: 1, advance: 13 },
          { offset: 3, length: 1, advance: 12 }
        ],
        glyphs: [
          {
            glyphId: 65,
            cluster: 1,
            x: 20,
            y: 0,
            xAdvance: 11,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0,
            fontId: "latin",
            fontFamily: "Latin Fixture"
          },
          {
            glyphId: 66,
            cluster: 2,
            x: 31,
            y: 0,
            xAdvance: 13,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0,
            fontId: "latin",
            fontFamily: "Latin Fixture"
          },
          {
            glyphId: 67,
            cluster: 3,
            x: 44,
            y: 0,
            xAdvance: 12,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0,
            fontId: "latin",
            fontFamily: "Latin Fixture"
          }
        ],
        glyphCoverage: "partial"
      });

      const layout = layoutQuireText({
        ...options("你ABC", 40),
        shapeText: mixedCoverageShaper
      });

      expect(layout.visualRuns).toEqual([
        expect.objectContaining({
          line: 0,
          x: 0,
          clusters: [{ from: 0, to: 1, x: 0, advance: 20 }],
          glyphs: []
        }),
        expect.objectContaining({
          line: 1,
          x: 0,
          glyphCoverage: "complete",
          clusters: [
            { from: 1, to: 2, x: 0, advance: 11 },
            { from: 2, to: 3, x: 11, advance: 13 },
            { from: 3, to: 4, x: 24, advance: 12 }
          ],
          glyphs: [
            expect.objectContaining({ glyphId: 65, cluster: 1, x: 0 }),
            expect.objectContaining({ glyphId: 66, cluster: 2, x: 11 }),
            expect.objectContaining({ glyphId: 67, cluster: 3, x: 24 })
          ]
        })
      ]);
    });

    it("keeps ligature components with their base glyph under partial coverage", () => {
      const partialLigatureShaper: QuireTextLayoutOptions["shapeText"] = () => ({
        clusters: [
          { offset: 0, length: 2, advance: 20 },
          { offset: 2, length: 1, advance: 10 },
          { offset: 3, length: 1, advance: 10 },
          { offset: 4, length: 1, advance: 10 },
          { offset: 5, length: 1, advance: 10 },
          { offset: 6, length: 1, advance: 10 }
        ],
        glyphs: [
          {
            glyphId: 64258,
            cluster: 0,
            x: 0,
            y: 0,
            xAdvance: 20,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0
          },
          {
            glyphId: 111,
            cluster: 2,
            x: 20,
            y: 0,
            xAdvance: 10,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0
          },
          {
            glyphId: 119,
            cluster: 3,
            x: 30,
            y: 0,
            xAdvance: 10,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0
          }
        ],
        glyphCoverage: "partial"
      });

      const layout = layoutQuireText({
        ...options("flowing", 1000),
        shapeText: partialLigatureShaper
      });

      expect(layout.visualRuns[0]).toEqual(
        expect.objectContaining({
          glyphCoverage: "partial",
          clusters: [
            { from: 0, to: 1, x: 0, advance: 20 },
            { from: 1, to: 2, x: 20, advance: 0 },
            { from: 2, to: 3, x: 20, advance: 10 },
            { from: 3, to: 4, x: 30, advance: 10 }
          ],
          codepoints: [{ offset: 1, role: "ligatureComponent" }],
          glyphs: [
            expect.objectContaining({ glyphId: 64258, cluster: 0, x: 0 }),
            expect.objectContaining({ glyphId: 111, cluster: 2, x: 20 }),
            expect.objectContaining({ glyphId: 119, cluster: 3, x: 30 })
          ]
        })
      );
      expect(layout.visualRuns.map((run) => run.clusters.map((cluster) => cluster.from))).toEqual([
        [0, 1, 2, 3],
        [4, 5, 6]
      ]);
    });

    it("rebases glyphs to the visual run origin and preserves intra-cluster glyph offsets", () => {
      // A combining mark sits at x=3 inside its base cluster; the cluster is the
      // right-to-left run "א" placed after the "ab" run, so the run origin is 20
      // in line space but glyph x is reported relative to the run origin (0), with
      // the mark keeping its +3 intra-cluster offset.
      const markShaper: QuireTextLayoutOptions["shapeText"] = (text) => {
        if (text === "א") {
          return {
            clusters: [{ offset: 0, length: 1, advance: 10 }],
            glyphs: [
              { glyphId: 7000, cluster: 0, x: 0, y: 0, xAdvance: 10, yAdvance: 0, xOffset: 0, yOffset: 0 },
              { glyphId: 7001, cluster: 0, x: 0, y: 0, xAdvance: 0, yAdvance: 0, xOffset: 3, yOffset: 0 }
            ],
            glyphCoverage: "complete"
          };
        }
        return {
          clusters: Array.from(text).map((_, index) => ({ offset: index, length: 1, advance: 10 })),
          glyphs: Array.from(text).map((_, index) => ({
            glyphId: 100 + index,
            cluster: index,
            x: index * 10,
            y: 0,
            xAdvance: 10,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0
          })),
          glyphCoverage: "complete"
        };
      };

      const layout = layoutQuireText({
        runs: [{ text: "ab", font: "16px test" }, { text: "א", font: "16px test" }],
        maxWidth: 1000,
        lineHeight: 24,
        baselineOffset: 18,
        baseDirection: "ltr",
        measureText,
        shapeText: markShaper
      });

      expect(layout.visualRuns).toEqual([
        {
          line: 0,
          run: 0,
          direction: "ltr",
          x: 0,
          glyphCoverage: "complete",
          clusters: [
            { from: 0, to: 1, x: 0, advance: 10 },
            { from: 1, to: 2, x: 10, advance: 10 }
          ],
          codepoints: [],
          glyphs: [
            { glyphId: 100, cluster: 0, x: 0, y: 0, xAdvance: 10, yAdvance: 0, xOffset: 0, yOffset: 0 },
            { glyphId: 101, cluster: 1, x: 10, y: 0, xAdvance: 10, yAdvance: 0, xOffset: 0, yOffset: 0 }
          ]
        },
        {
          line: 0,
          run: 1,
          direction: "rtl",
          x: 20,
          glyphCoverage: "complete",
          clusters: [{ from: 0, to: 1, x: 0, advance: 10 }],
          codepoints: [],
          glyphs: [
            { glyphId: 7000, cluster: 0, x: 0, y: 0, xAdvance: 10, yAdvance: 0, xOffset: 0, yOffset: 0 },
            { glyphId: 7001, cluster: 0, x: 0, y: 0, xAdvance: 0, yAdvance: 0, xOffset: 3, yOffset: 0 }
          ]
        }
      ]);
    });

    it("marks an absorbed ligature component as a ligatureComponent codepoint", () => {
      // Arabic لا shapes to one glyph spanning both source codepoints (real
      // HarfBuzz: one cluster {from:0,to:2}, one glyph at cluster 0). The alef
      // (offset 1) gets no glyph and a zero advance, so it is a ligature
      // component — a caret between lam and alef is interpolated, not edge-snapped.
      const ligatureShaper: QuireTextLayoutOptions["shapeText"] = () => ({
        clusters: [{ offset: 0, length: 2, advance: 20 }],
        glyphs: [
          { glyphId: 9000, cluster: 0, x: 0, y: 0, xAdvance: 20, yAdvance: 0, xOffset: 0, yOffset: 0 }
        ],
        glyphCoverage: "complete"
      });

      const layout = layoutQuireText({
        ...options("لا", 1000),
        baseDirection: "rtl",
        shapeText: ligatureShaper
      });

      expect(layout.visualRuns).toEqual([
        {
          line: 0,
          run: 0,
          direction: "rtl",
          x: 0,
          glyphCoverage: "complete",
          clusters: [
            { from: 0, to: 1, x: 0, advance: 20 },
            { from: 1, to: 2, x: 0, advance: 0 }
          ],
          codepoints: [{ offset: 1, role: "ligatureComponent" }],
          glyphs: [
            { glyphId: 9000, cluster: 0, x: 0, y: 0, xAdvance: 20, yAdvance: 0, xOffset: 0, yOffset: 0 }
          ]
        }
      ]);
    });

    it("places every shaped glyph at its cluster's run-local x (paint x === cluster x invariant)", () => {
      const layout = layoutQuireText({
        ...options("אבגדהו", 30),
        baseDirection: "rtl",
        shapeText: rtlShaper
      });

      let glyphsSeen = 0;
      for (const run of layout.visualRuns) {
        const clusterXByOffset = new Map(run.clusters.map((cluster) => [cluster.from, cluster.x]));
        for (const glyph of run.glyphs) {
          glyphsSeen += 1;
          // One glyph per cluster here, keyed by source offset, so its x must land
          // exactly on its cluster's run-local x — even when wrapping splits the
          // shaped segment across lines (a non-zero run-origin translation).
          expect(glyph.x).toBe(clusterXByOffset.get(glyph.cluster));
        }
      }
      expect(glyphsSeen).toBe(6);
    });

    it("keeps cluster and line output unchanged for LTR and CJK while adding visual runs (regression gate)", () => {
      const ltr = layoutQuireText(options("ab cd", 40));
      expect(ltr.clusters).toEqual([
        { run: 0, offset: 0, length: 1, x: 0, advance: 10, line: 0 },
        { run: 0, offset: 1, length: 1, x: 10, advance: 10, line: 0 },
        { run: 0, offset: 2, length: 1, x: 20, advance: 10, line: 0 },
        { run: 0, offset: 3, length: 1, x: 0, advance: 10, line: 1 },
        { run: 0, offset: 4, length: 1, x: 10, advance: 10, line: 1 }
      ]);

      const cjk = layoutQuireText(options("你好世界", 20));
      expect(cjk.clusters.map((cluster) => [cluster.offset, cluster.x, cluster.line])).toEqual([
        [0, 0, 0],
        [1, 10, 0],
        [2, 0, 1],
        [3, 10, 1]
      ]);
      // CJK is a single left-to-right visual run per line, no glyphs.
      expect(cjk.visualRuns.map((run) => [run.line, run.direction, run.glyphs.length])).toEqual([
        [0, "ltr", 0],
        [1, "ltr", 0]
      ]);
    });
  });
});
