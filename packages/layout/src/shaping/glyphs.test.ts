import { describe, expect, it } from "vitest";
import { mapQuireGlyphPlacementsToShapedRun } from "./glyphs";

describe("canvas glyph placement mapping", () => {
  it("groups adjacent glyphs that share one source cluster", () => {
    expect(mapQuireGlyphPlacementsToShapedRun({
      text: "office",
      glyphs: [
        { codepoint: 82, cluster: 0, xAdvance: 8 },
        { codepoint: 5042, cluster: 1, xAdvance: 14 },
        { codepoint: 70, cluster: 4, xAdvance: 7 },
        { codepoint: 72, cluster: 5, xAdvance: 7 }
      ],
      direction: "ltr",
      ascent: 12,
      descent: 4
    })).toEqual({
      clusters: [
        { from: 0, to: 1, x: 0, advance: 8, rtl: false },
        { from: 1, to: 4, x: 8, advance: 14, rtl: false },
        { from: 4, to: 5, x: 22, advance: 7, rtl: false },
        { from: 5, to: 6, x: 29, advance: 7, rtl: false }
      ],
      width: 36,
      ascent: 12,
      descent: 4,
      glyphCoverage: "partial",
      glyphs: [
        {
          glyphId: 82,
          sourceCluster: 0,
          x: 0,
          y: 0,
          xAdvance: 8,
          yAdvance: 0,
          xOffset: 0,
          yOffset: 0
        },
        {
          glyphId: 5042,
          sourceCluster: 1,
          x: 8,
          y: 0,
          xAdvance: 14,
          yAdvance: 0,
          xOffset: 0,
          yOffset: 0
        },
        {
          glyphId: 70,
          sourceCluster: 4,
          x: 22,
          y: 0,
          xAdvance: 7,
          yAdvance: 0,
          xOffset: 0,
          yOffset: 0
        },
        {
          glyphId: 72,
          sourceCluster: 5,
          x: 29,
          y: 0,
          xAdvance: 7,
          yAdvance: 0,
          xOffset: 0,
          yOffset: 0
        }
      ]
    });
  });

  it("keeps visual order while resolving RTL logical cluster ranges", () => {
    expect(mapQuireGlyphPlacementsToShapedRun({
      text: "אבג",
      glyphs: [
        { codepoint: 3, cluster: 2, xAdvance: 9 },
        { codepoint: 2, cluster: 1, xAdvance: 8 },
        { codepoint: 1, cluster: 0, xAdvance: 7 }
      ],
      direction: "rtl"
    })).toEqual({
      clusters: [
        { from: 2, to: 3, x: 0, advance: 9, rtl: true },
        { from: 1, to: 2, x: 9, advance: 8, rtl: true },
        { from: 0, to: 1, x: 17, advance: 7, rtl: true }
      ],
      width: 24,
      ascent: 0,
      descent: 0,
      glyphCoverage: "partial",
      glyphs: [
        {
          glyphId: 3,
          sourceCluster: 2,
          x: 0,
          y: 0,
          xAdvance: 9,
          yAdvance: 0,
          xOffset: 0,
          yOffset: 0
        },
        {
          glyphId: 2,
          sourceCluster: 1,
          x: 9,
          y: 0,
          xAdvance: 8,
          yAdvance: 0,
          xOffset: 0,
          yOffset: 0
        },
        {
          glyphId: 1,
          sourceCluster: 0,
          x: 17,
          y: 0,
          xAdvance: 7,
          yAdvance: 0,
          xOffset: 0,
          yOffset: 0
        }
      ]
    });
  });

  it("marks glyph coverage complete when every placement has font identity", () => {
    expect(mapQuireGlyphPlacementsToShapedRun({
      text: "A",
      glyphs: [
        {
          codepoint: 36,
          cluster: 0,
          xAdvance: 12,
          fontId: "fixture-serif",
          fontFamily: "Fixture Serif"
        }
      ]
    }).glyphCoverage).toBe("complete");
  });
});
