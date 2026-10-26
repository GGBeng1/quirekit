import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildQuireTextFragment } from "../text/fragments";
import { createFontKitGlyphPathFontLoader } from "./fontkit-outline";
import { createHarfBuzzTextShaperBackend } from "./harfbuzz";
import { createQuireTextMeasurerFromShaper } from "./measurer";

const require = createRequire(import.meta.url);

describe("harfbuzz text shaper backend", () => {
  it("shapes a Latin run with real glyph clusters", async () => {
    const font = await loadDejaVuSansFont();

    expect(font.shapeRun({
      text: "office",
      font: "16px DejaVu Sans",
      size: 16,
      direction: "ltr",
      script: "latn",
      language: "en"
    })).toMatchObject({
      clusters: [
        { from: 0, to: 1, rtl: false },
        { from: 1, to: 4, rtl: false },
        { from: 4, to: 5, rtl: false },
        { from: 5, to: 6, rtl: false }
      ],
      ascent: 1901 / 2048 * 16,
      descent: 483 / 2048 * 16
    });
  });

  it("passes OpenType feature overrides to HarfBuzz", async () => {
    const font = await loadDejaVuSansFont();
    const shaped = font.shapeRun({
      text: "office",
      font: "16px DejaVu Sans",
      size: 16,
      direction: "ltr",
      script: "latn",
      language: "en",
      features: [
        { tag: "liga", value: false }
      ]
    });

    expect(shaped.clusters.map((cluster) => [cluster.from, cluster.to])).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6]
    ]);
  });

  it("shapes a Simplified Chinese run with a CJK font fixture", async () => {
    const font = await loadNotoSansHansFont();
    const shaped = font.shapeRun({
      text: "你好世界",
      font: "16px Noto Sans Hans",
      size: 16,
      direction: "ltr",
      script: "hani",
      language: "zh-CN"
    });

    expect(shaped.clusters.map((cluster) => [cluster.from, cluster.to])).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4]
    ]);
    expect(shaped.clusters.every((cluster) => cluster.advance > 0)).toBe(true);
    expect(shaped.width).toBeGreaterThan(0);
    expect(shaped.ascent).toBeGreaterThan(0);
    expect(shaped.descent).toBeGreaterThan(0);
  });

  it("preserves fractional em advances instead of truncating the requested size", async () => {
    const font = await loadNotoSansHansFont();
    for (const size of [0.5, 16, 21, 64 / 3, 21.75, 22]) {
      const shaped = font.shapeRun({ text: "甲乙丙丁", font: `${size}px Noto Sans Hans`, size });
      expect(shaped.width).toBeCloseTo(size * 4, 10);
      expect(shaped.clusters.map(cluster => cluster.advance)).toEqual([size, size, size, size]);
    }
  });

  it.each([
    { text: "AV office x\u0301", direction: "ltr" as const },
    { text: "بِسْمِ", direction: "rtl" as const }
  ])("scales glyph positions and metrics together for $direction text", async ({ text, direction }) => {
    const font = await loadDejaVuSansFont();
    const reference = font.shapeRun({ text, direction, font: "32px DejaVu Sans", size: 32 });
    expect(font.canShapeText?.(text)).toBe(true);
    const size = 64 / 3;
    const result = font.shapeRun({ text, direction, font: `${size}px DejaVu Sans`, size });
    const ratio = size / 32;
    expect(result.width).toBeCloseTo(reference.width * ratio, 10);
    expect(result.ascent).toBeCloseTo(reference.ascent * ratio, 10);
    expect(result.descent).toBeCloseTo(reference.descent * ratio, 10);
    expect(reference.glyphs!.some(glyph => glyph.xOffset !== 0 || glyph.yOffset !== 0)).toBe(true);
    expect(result.glyphs).toHaveLength(reference.glyphs!.length);
    result.glyphs!.forEach((glyph, index) => {
      const original = reference.glyphs![index]!;
      expect(glyph.glyphId).toBe(original.glyphId);
      expect(glyph.sourceCluster).toBe(original.sourceCluster);
      for (const key of ["x", "y", "xAdvance", "yAdvance", "xOffset", "yOffset"] as const) {
        expect(glyph[key]).toBeCloseTo(original[key] * ratio, 10);
      }
    });
  });

  it("feeds shaped clusters through the existing text fragment caret path", async () => {
    const font = await loadDejaVuSansFont();
    const measurer = createQuireTextMeasurerFromShaper({
      font,
      resolveRunOptions: () => ({
        direction: "ltr",
        language: "en",
        script: "latn",
        size: 16
      })
    });
    const fragment = buildQuireTextFragment({
      id: "fragment-hb",
      text: "office",
      range: { from: 20, to: 26 },
      rect: { x: 0, y: 0, width: 200, height: 24 },
      font: "16px DejaVu Sans",
      lineHeight: 24,
      baseline: 18,
      measurer
    });

    expect(fragment.caretStops.map((stop) => stop.position.pos)).toEqual([
      20,
      21,
      24,
      25,
      26
    ]);
    expect(fragment.rect.width).toBeGreaterThan(0);
  });

  it("can attach a fontkit outline provider to shaped glyph ids", async () => {
    const font = await loadDejaVuSansFont({
      glyphPathFontLoader: createFontKitGlyphPathFontLoader()
    });
    const shaped = font.shapeRun({
      text: "A",
      font: "16px DejaVu Sans",
      size: 16,
      direction: "ltr",
      script: "latn",
      language: "en"
    });
    const glyph = shaped.glyphs?.[0];

    expect(glyph).toMatchObject({
      glyphId: expect.any(Number),
      fontId: "dejavu-sans"
    });
    expect(font.getGlyphPath?.(glyph!.glyphId, {
      font: "16px DejaVu Sans",
      size: 16
    })?.segments.length).toBeGreaterThan(0);
  });
});

/**
 * Loads the DejaVu Sans fixture font through the HarfBuzz backend.
 *
 * @param options - Optional paired outline provider.
 * @returns Loaded shaper font.
 */
async function loadDejaVuSansFont(
  options: Parameters<typeof createHarfBuzzTextShaperBackend>[0] = {}
) {
  const backend = createHarfBuzzTextShaperBackend(options);
  const bytes = readFileSync(require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf"));

  return backend.loadFont({
    id: "dejavu-sans",
    family: "DejaVu Sans",
    data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    style: "normal",
    weight: 400
  });
}

/**
 * Loads the Noto Sans Hans fixture font through the HarfBuzz backend.
 *
 * @returns Loaded shaper font.
 */
async function loadNotoSansHansFont() {
  const backend = createHarfBuzzTextShaperBackend();
  const packageEntry = require.resolve("@embedpdf/fonts-sc");
  const bytes = readFileSync(resolve(dirname(packageEntry), "../fonts/NotoSansHans-Regular.otf"));

  return backend.loadFont({
    id: "noto-sans-hans",
    family: "Noto Sans Hans",
    data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    style: "normal",
    weight: 400
  });
}
