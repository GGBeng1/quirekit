import { describe, expect, it } from "vitest";
import {
  createQuireFontResolver,
  createQuireTextMeasurerFromFontResolver,
  parseQuireFontRequest
} from "./index";
import type {
  QuireLoadedShaperFont,
  QuireShapeRunOptions
} from "../types";

describe("canvas font resolver", () => {
  it("parses CSS font shorthand into family, style, and weight candidates", () => {
    expect(parseQuireFontRequest("italic bold 16px Arial, 'Noto Sans Hans', sans-serif"))
      .toEqual({
        families: ["Arial", "Noto Sans Hans", "sans-serif"],
        style: "italic",
        weight: 700
      });
  });

  it("splits text into requested and fallback font runs by glyph coverage", () => {
    const resolver = createQuireFontResolver({
      fonts: [
        createFont("arial-regular", "Arial", 400, /[A-Za-z ]/u),
        createFont("noto-hans-regular", "Noto Sans Hans", 400, /[\u4E00-\u9FFF]/u)
      ],
      fallbackFamilies: ["Noto Sans Hans"]
    });

    expect(resolver.resolveTextRuns("Hello 世界", "16px Arial").map((run) => ({
      from: run.from,
      to: run.to,
      text: run.text,
      font: run.font.id
    }))).toEqual([
      { from: 0, to: 6, text: "Hello ", font: "arial-regular" },
      { from: 6, to: 8, text: "世界", font: "noto-hans-regular" }
    ]);
  });

  it("prefers the closest style and weight inside the requested family", () => {
    const resolver = createQuireFontResolver({
      fonts: [
        createFont("arial-regular", "Arial", 400, /[A-Za-z]/u),
        createFont("arial-bold", "Arial", 700, /[A-Za-z]/u)
      ]
    });

    expect(resolver.resolveTextRuns("Bold", "bold 16px Arial").map((run) => run.font.id))
      .toEqual(["arial-bold"]);
  });

  it("shapes resolved fallback runs as one continuous shaped run", () => {
    const resolver = createQuireFontResolver({
      fonts: [
        createFont("arial-regular", "Arial", 400, /[A-Za-z]/u, 10),
        createFont("noto-hans-regular", "Noto Sans Hans", 400, /[\u4E00-\u9FFF]/u, 20)
      ],
      fallbackFamilies: ["Noto Sans Hans"]
    });
    const measurer = createQuireTextMeasurerFromFontResolver({ resolver });

    expect(measurer.shapeRun?.("A你", "16px Arial")).toEqual({
      clusters: [
        { from: 0, to: 1, x: 0, advance: 10, rtl: false },
        { from: 1, to: 2, x: 10, advance: 20, rtl: false }
      ],
      width: 30,
      ascent: 12,
      descent: 4
    });
  });

  it("falls back to a baseline measurer for unresolved glyph coverage gaps", () => {
    const resolver = createQuireFontResolver({
      fonts: [
        createFont("arial-regular", "Arial", 400, /[A-Za-z]/u, 10)
      ]
    });
    const measurer = createQuireTextMeasurerFromFontResolver({
      resolver,
      fallbackMeasurer: createFallbackTextMeasurer(18)
    });

    expect(measurer.measureText("A你", "16px Arial")).toMatchObject({ width: 28 });
    expect(measurer.shapeRun?.("A你", "16px Arial").clusters).toEqual([
      { from: 0, to: 1, x: 0, advance: 10, rtl: false },
      { from: 1, to: 2, x: 10, advance: 18, rtl: false }
    ]);
  });

  it("can normalize shaped cluster advances to the fallback measurer width", () => {
    const resolver = createQuireFontResolver({
      fonts: [
        createFont("arial-regular", "Arial", 400, /[A-Za-z]/u, 10)
      ]
    });
    const measurer = createQuireTextMeasurerFromFontResolver({
      resolver,
      fallbackMeasurer: createFallbackTextMeasurer(12),
      normalizeWidthToFallbackMeasurer: true
    });

    expect(measurer.measureText("AB", "16px Arial")).toMatchObject({ width: 24 });
    expect(measurer.shapeRun?.("AB", "16px Arial").clusters).toEqual([
      { from: 0, to: 1, x: 0, advance: 12, rtl: false },
      { from: 1, to: 2, x: 12, advance: 12, rtl: false }
    ]);
  });

  it("caches shaped runs to keep repeated selection geometry updates cheap", () => {
    let shapeCount = 0;
    const resolver = createQuireFontResolver({
      fonts: [
        createFont("arial-regular", "Arial", 400, /[A-Za-z ]/u, 10, () => {
          shapeCount += 1;
        })
      ]
    });
    const measurer = createQuireTextMeasurerFromFontResolver({ resolver });

    expect(measurer.measureText("Hello world", "16px Arial")).toMatchObject({ width: 110 });
    expect(measurer.shapeRun?.("Hello world", "16px Arial").width).toBe(110);
    expect(measurer.measureText("Hello world", "16px Arial")).toMatchObject({ width: 110 });
    expect(shapeCount).toBe(1);
  });

  it("keeps language and direction in the shaped-run cache identity", () => {
    const requests: QuireShapeRunOptions[] = [];
    const resolver = createQuireFontResolver({
      fonts: [
        createFont("arial-regular", "Arial", 400, /[A-Za-z ]/u, 10, (options) => {
          requests.push(options);
        })
      ]
    });
    const measurer = createQuireTextMeasurerFromFontResolver({ resolver });

    expect(measurer.shapeRun?.("Hello", "16px Arial", {
      language: "en-US",
      direction: "ltr"
    }).width).toBe(50);
    expect(measurer.shapeRun?.("Hello", "16px Arial", {
      language: "tr-TR",
      direction: "ltr"
    }).width).toBe(50);
    expect(measurer.shapeRun?.("Hello", "16px Arial", {
      language: "en-US",
      direction: "ltr"
    }).width).toBe(50);
    expect(requests.map(({ language, direction }) => ({ language, direction })))
      .toEqual([
        { language: "en-US", direction: "ltr" },
        { language: "tr-TR", direction: "ltr" }
      ]);
  });

  it("keeps optional-ligature policy in shaped-run cache identity", () => {
    const requests: QuireShapeRunOptions[] = [];
    const resolver = createQuireFontResolver({
      fonts: [
        createFont("arial-regular", "Arial", 400, /[A-Za-z ]/u, 10, (options) => {
          requests.push(options);
        })
      ]
    });
    const measurer = createQuireTextMeasurerFromFontResolver({ resolver });

    measurer.shapeRun?.("office", "16px Arial", { language: "en-US" });
    measurer.shapeRun?.("office", "16px Arial", {
      language: "en-US",
      disableOptionalLigatures: true
    });
    measurer.shapeRun?.("office", "16px Arial", {
      language: "en-US",
      disableOptionalLigatures: true
    });

    expect(requests).toHaveLength(2);
    expect(requests[0]?.features).toBeUndefined();
    expect(requests[1]?.features).toEqual([
      { tag: "liga", value: false },
      { tag: "clig", value: false },
      { tag: "dlig", value: false },
      { tag: "hlig", value: false }
    ]);
  });
});

/**
 * Creates a deterministic loaded-font test double.
 *
 * @param id - Loaded font id.
 * @param family - CSS family represented by the font.
 * @param weight - CSS numeric weight represented by the font.
 * @param coverage - Character coverage regular expression.
 * @param advance - Fixed glyph advance used by the test double.
 * @param onShape - Optional observer for exact shaping options.
 * @returns Loaded-font test double.
 */
function createFont(
  id: string,
  family: string,
  weight: number,
  coverage: RegExp,
  advance = 10,
  onShape?: (options: QuireShapeRunOptions) => void
): QuireLoadedShaperFont {
  return {
    id,
    source: {
      id,
      family,
      weight,
      data: new ArrayBuffer(0)
    },
    canShapeText(text) {
      return Array.from(text).every((character) => coverage.test(character));
    },
    shapeRun(options) {
      onShape?.(options);
      const characters = Array.from(options.text);
      return {
        clusters: characters.map((character, index) => ({
          from: index,
          to: index + character.length,
          x: index * advance,
          advance,
          rtl: false
        })),
        width: characters.length * advance,
        ascent: 12,
        descent: 4
      };
    }
  };
}

/**
 * Creates a fallback text measurer for unresolved resolver gaps.
 *
 * @param advance - Width assigned to each grapheme.
 * @returns Fallback text measurer.
 */
function createFallbackTextMeasurer(advance: number) {
  return {
    /**
     * Measures fallback text with fixed grapheme advance.
     *
     * @param text - Text content to measure.
     * @returns Width-only fallback metrics.
     */
    measureText(text: string) {
      return {
        width: Array.from(text).length * advance
      };
    }
  };
}
