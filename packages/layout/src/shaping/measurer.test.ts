import { describe, expect, it } from "vitest";
import {
  createQuireTextMeasurerFromShaper,
  parseQuireFontPixelSize,
  resolveQuireFontPixelSize
} from "./index";
import type { QuireLoadedShaperFont } from "./types";

describe("canvas layout engine shaping measurer", () => {
  it("parses pixel sizes from CSS font shorthands", () => {
    expect(parseQuireFontPixelSize("italic 700 18px/24px Inter")).toBe(18);
    expect(parseQuireFontPixelSize("bold 12.5px sans-serif")).toBe(12.5);
    expect(parseQuireFontPixelSize("1rem sans-serif")).toBeNull();
    expect(resolveQuireFontPixelSize("1rem sans-serif")).toBe(16);
  });

  it("adapts a loaded shaper font to the text measurer contract", () => {
    const calls: unknown[] = [];
    const loadedFont: QuireLoadedShaperFont = {
      id: "font:inter",
      source: {
        id: "inter",
        family: "Inter",
        data: new ArrayBuffer(0)
      },
      shapeRun(options) {
        calls.push(options);
        return {
          clusters: [
            { from: 0, to: 2, x: 0, advance: 14, rtl: false }
          ],
          width: 14,
          ascent: 10,
          descent: 3
        };
      }
    };
    const measurer = createQuireTextMeasurerFromShaper({
      font: loadedFont,
      resolveRunOptions: () => ({
        direction: "ltr",
        language: "en",
        script: "latn",
        size: 18
      })
    });

    expect(measurer.measureText("fi", "700 16px Inter")).toEqual({ width: 14 });
    expect(measurer.shapeRun?.("fi", "700 16px Inter")).toEqual({
      clusters: [
        { from: 0, to: 2, x: 0, advance: 14, rtl: false }
      ],
      width: 14,
      ascent: 10,
      descent: 3
    });
    expect(calls[0]).toEqual({
      text: "fi",
      font: "700 16px Inter",
      size: 18,
      direction: "ltr",
      language: "en",
      script: "latn"
    });
  });

  it("falls back to baseline measurement when configured", () => {
    const loadedFont: QuireLoadedShaperFont = {
      id: "font:broken",
      source: {
        id: "broken",
        family: "Broken",
        data: new ArrayBuffer(0)
      },
      shapeRun() {
        throw new Error("shape failed");
      }
    };
    const measurer = createQuireTextMeasurerFromShaper({
      font: loadedFont,
      fallbackMeasurer: {
        measureText: (text) => ({ width: text.length * 5 })
      }
    });

    expect(measurer.shapeRun?.("abc", "16px sans-serif")).toEqual({
      clusters: [
        { from: 0, to: 1, x: 0, advance: 5, rtl: false },
        { from: 1, to: 2, x: 5, advance: 5, rtl: false },
        { from: 2, to: 3, x: 10, advance: 5, rtl: false }
      ],
      width: 15,
      ascent: 0,
      descent: 0
    });
  });

  it("disables optional ligatures without disabling required shaping", () => {
    const calls: unknown[] = [];
    const loadedFont: QuireLoadedShaperFont = {
      id: "font:tracked",
      source: {
        id: "tracked",
        family: "Tracked",
        data: new ArrayBuffer(0)
      },
      shapeRun(options) {
        calls.push(options);
        return { clusters: [], width: 0, ascent: 0, descent: 0 };
      }
    };
    const measurer = createQuireTextMeasurerFromShaper({
      font: loadedFont,
      resolveRunOptions: () => ({
        features: [
          { tag: "kern", value: true },
          { tag: "liga", value: true },
          { tag: "rlig", value: true }
        ]
      })
    });

    measurer.shapeRun?.("office", "16px Tracked", {
      language: "en-US",
      direction: "ltr",
      disableOptionalLigatures: true
    });

    expect(calls).toEqual([expect.objectContaining({
      language: "en-US",
      direction: "ltr",
      features: [
        { tag: "kern", value: true },
        { tag: "rlig", value: true },
        { tag: "liga", value: false },
        { tag: "clig", value: false },
        { tag: "dlig", value: false },
        { tag: "hlig", value: false }
      ]
    })]);
  });
});
