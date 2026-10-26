import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import type { CanvasGlyphPathOutline } from "@quirekit/renderer";
import { createFontKitGlyphPathFontLoader } from "./index";
import type { QuireShaperFontSource } from "../types";

const require = createRequire(import.meta.url);

describe("fontkit glyph outline loader", () => {
  it("loads scaled baseline-oriented glyph outlines", async () => {
    const font = await createFontKitGlyphPathFontLoader()
      .loadGlyphPathFont(loadDejaVuSansSource());

    const outline16 = font?.getGlyphPath(36, {
      font: "16px DejaVu Sans",
      size: 16
    });
    const outline32 = font?.getGlyphPath(36, {
      font: "32px DejaVu Sans",
      size: 32
    });

    expect(outline16?.segments.length).toBeGreaterThan(0);
    expect(firstMovePoint(outline32).x).toBeCloseTo(firstMovePoint(outline16).x * 2);
    expect(firstMovePoint(outline32).y).toBeCloseTo(firstMovePoint(outline16).y * 2);
    expect(firstMovePoint(outline16).y).toBeLessThan(0);
  });

  it("keeps empty outlines for spacing glyphs", async () => {
    const font = await createFontKitGlyphPathFontLoader()
      .loadGlyphPathFont(loadDejaVuSansSource());

    expect(font?.getGlyphPath(3, {
      font: "16px DejaVu Sans",
      size: 16
    })).toEqual({ segments: [] });
  });
});

/**
 * Loads the DejaVu Sans fixture source metadata.
 *
 * @returns Font source containing fixture bytes.
 */
function loadDejaVuSansSource(): QuireShaperFontSource {
  const bytes = readFileSync(require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf"));

  return {
    id: "dejavu-sans",
    family: "DejaVu Sans",
    data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    style: "normal",
    weight: 400
  };
}

/**
 * Reads the first move-to point from a glyph outline.
 *
 * @param outline - Glyph outline returned by the fontkit loader.
 * @returns First move-to point.
 */
function firstMovePoint(outline: CanvasGlyphPathOutline | null | undefined) {
  const point = outline?.segments.find((segment) => segment.kind === "move-to")?.point;

  if (point === undefined) {
    throw new Error("Expected a move-to point.");
  }

  return point;
}
