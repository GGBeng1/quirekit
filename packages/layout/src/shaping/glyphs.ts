import type { QuireGlyphRunCoverage } from "@quirekit/renderer";
import type {
  QuireShapedGlyphPlacement,
  QuireShapedTextCluster,
  QuireShapedTextRun
} from "../text/types";
import type { QuireTextShapeDirection } from "./types";

/** Glyph placement emitted by a shaping backend. */
export interface QuireShaperGlyphPlacement {
  /** Shaped glyph id. */
  readonly codepoint: number;
  /** Source text offset reported by the shaping backend. */
  readonly cluster: number;
  /** Horizontal advance in CSS pixels. */
  readonly xAdvance: number;
  /** Vertical advance in CSS pixels. */
  readonly yAdvance?: number;
  /** Horizontal offset in CSS pixels. */
  readonly xOffset?: number;
  /** Vertical offset in CSS pixels. */
  readonly yOffset?: number;
  /** Loaded font id used to shape this glyph. */
  readonly fontId?: string;
  /** Loaded font family used to shape this glyph. */
  readonly fontFamily?: string;
}

/** Options for mapping backend glyph placements to layout clusters. */
export interface QuireGlyphClusterMapOptions {
  /** Original logical text run. */
  readonly text: string;
  /** Glyph placements in backend visual order. */
  readonly glyphs: readonly QuireShaperGlyphPlacement[];
  /** Direction of this already segmented run. */
  readonly direction?: QuireTextShapeDirection;
  /** Scaled font ascent in CSS pixels. */
  readonly ascent?: number;
  /** Scaled font descent in CSS pixels. */
  readonly descent?: number;
}

/** Internal glyph group sharing one source cluster. */
interface QuireGlyphClusterGroup {
  /** Source text offset reported by the shaping backend. */
  readonly sourceOffset: number;
  /** Visual x offset in CSS pixels. */
  readonly x: number;
  /** Accumulated advance in CSS pixels. */
  readonly advance: number;
}

/**
 * Maps shaped glyph placements to QuireKit text clusters.
 *
 * @param options - Logical text, visual glyph placements, direction, and metrics.
 * @returns Cluster-based shape result used by layout geometry.
 */
export function mapQuireGlyphPlacementsToShapedRun(
  options: QuireGlyphClusterMapOptions
): QuireShapedTextRun {
  const groups = groupAdjacentGlyphClusters(options.glyphs);
  const sortedSourceOffsets = getSortedSourceOffsets(groups);
  const rtl = options.direction === "rtl";
  const clusters = groups.map((group): QuireShapedTextCluster => ({
    from: group.sourceOffset,
    to: resolveClusterEnd(group.sourceOffset, sortedSourceOffsets, options.text.length),
    x: group.x,
    advance: group.advance,
    rtl
  }));

  const glyphs = mapQuireGlyphPlacements(options.glyphs);

  return {
    clusters,
    width: groups.reduce((width, group) => width + group.advance, 0),
    ascent: options.ascent ?? 0,
    descent: options.descent ?? 0,
    ...(glyphs.length > 0
      ? { glyphs, glyphCoverage: resolveQuireGlyphCoverage(glyphs) }
      : {})
  };
}

/**
 * Maps backend glyph placements to renderer-neutral glyph metadata.
 *
 * @param glyphs - Backend glyph placements in visual order.
 * @returns Glyph placements with accumulated visual coordinates.
 */
function mapQuireGlyphPlacements(
  glyphs: readonly QuireShaperGlyphPlacement[]
): readonly QuireShapedGlyphPlacement[] {
  const placements: QuireShapedGlyphPlacement[] = [];
  let x = 0;
  let y = 0;

  for (const glyph of glyphs) {
    const xAdvance = glyph.xAdvance;
    const yAdvance = glyph.yAdvance ?? 0;

    placements.push({
      glyphId: glyph.codepoint,
      sourceCluster: glyph.cluster,
      x,
      y,
      xAdvance,
      yAdvance,
      xOffset: glyph.xOffset ?? 0,
      yOffset: glyph.yOffset ?? 0,
      ...(glyph.fontId === undefined ? {} : { fontId: glyph.fontId }),
      ...(glyph.fontFamily === undefined ? {} : { fontFamily: glyph.fontFamily })
    });

    x += xAdvance;
    y += yAdvance;
  }

  return placements;
}

/**
 * Resolves whether shaped glyph placements contain enough font identity for exact painting.
 *
 * @param glyphs - Shaped glyph placements to inspect.
 * @returns Complete coverage when every glyph carries a font id; partial otherwise.
 */
function resolveQuireGlyphCoverage(
  glyphs: readonly QuireShapedGlyphPlacement[]
): QuireGlyphRunCoverage {
  return glyphs.every((glyph) => glyph.fontId !== undefined)
    ? "complete"
    : "partial";
}

/**
 * Groups visually adjacent glyphs that represent the same source cluster.
 *
 * @param glyphs - Glyph placements in backend visual order.
 * @returns Visual cluster groups with accumulated advances.
 */
function groupAdjacentGlyphClusters(
  glyphs: readonly QuireShaperGlyphPlacement[]
): readonly QuireGlyphClusterGroup[] {
  const groups: QuireGlyphClusterGroup[] = [];
  let x = 0;

  for (const glyph of glyphs) {
    const previous = groups.at(-1);

    if (previous && previous.sourceOffset === glyph.cluster) {
      groups[groups.length - 1] = {
        ...previous,
        advance: previous.advance + glyph.xAdvance
      };
    } else {
      groups.push({
        sourceOffset: glyph.cluster,
        x,
        advance: glyph.xAdvance
      });
    }

    x += glyph.xAdvance;
  }

  return groups;
}

/**
 * Returns unique source offsets sorted in logical order.
 *
 * @param groups - Visual glyph cluster groups.
 * @returns Logical source offsets.
 */
function getSortedSourceOffsets(
  groups: readonly QuireGlyphClusterGroup[]
): readonly number[] {
  return Array.from(new Set(groups.map((group) => group.sourceOffset)))
    .sort((first, second) => first - second);
}

/**
 * Resolves the logical end offset for a source cluster.
 *
 * @param sourceOffset - Cluster start offset.
 * @param sortedSourceOffsets - Unique source offsets in logical order.
 * @param textLength - Original text run length.
 * @returns Cluster end offset.
 */
function resolveClusterEnd(
  sourceOffset: number,
  sortedSourceOffsets: readonly number[],
  textLength: number
): number {
  const offsetIndex = sortedSourceOffsets.indexOf(sourceOffset);
  const nextOffset = sortedSourceOffsets[offsetIndex + 1];

  return nextOffset ?? textLength;
}
