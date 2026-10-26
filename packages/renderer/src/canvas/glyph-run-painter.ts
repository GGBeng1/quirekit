import type {
  QuireGlyphRunCommand,
  QuireGlyphRunGlyphPlacement
} from "../core/display-list";
import type {
  CanvasGlyphRunPaintContext,
  CanvasGlyphRunPainter
} from "./types";

/** Resolved text cluster that can be painted with native Canvas text APIs. */
interface CanvasGlyphRunTextCluster {
  /** Source text offset represented by the cluster. */
  readonly sourceCluster: number;
  /** Text slice represented by the cluster. */
  readonly text: string;
  /** Horizontal paint offset from the glyph-run origin. */
  readonly x: number;
  /** Vertical paint offset from the glyph-run origin. */
  readonly y: number;
}

/** Logical source range represented by one source cluster. */
interface CanvasGlyphRunSourceRange {
  /** Inclusive source offset. */
  readonly from: number;
  /** Exclusive source offset. */
  readonly to: number;
}

/** Visually adjacent glyphs that share one source cluster. */
interface CanvasGlyphRunVisualCluster {
  /** Source text offset represented by the visual cluster. */
  readonly sourceCluster: number;
  /** First glyph placement in this visual cluster. */
  readonly firstGlyph: QuireGlyphRunGlyphPlacement;
}

/** Painter that draws shaped runs cluster-by-cluster with native Canvas text. */
export class CanvasClusterGlyphRunPainter implements CanvasGlyphRunPainter {
  /**
   * Paints one shaped glyph run by placing source text clusters at shaped offsets.
   *
   * @param command - Glyph-run command to paint.
   * @param context - Canvas 2D paint context.
   * @returns Whether at least one cluster was painted.
   */
  paintGlyphRun(
    command: QuireGlyphRunCommand,
    context: CanvasGlyphRunPaintContext
  ): boolean {
    // Complex scripts (cursive joining, reordering, combining marks) are wrong when
    // drawn cluster-by-cluster — each cluster re-shapes in isolation, so Arabic loses
    // its connected forms. Decline so the renderer draws the whole run with native
    // text, which joins/orders it correctly.
    if (textRequiresContextualShaping(command.text)) {
      return false;
    }

    const clusters = resolveGlyphRunTextClusters(command);

    if (clusters.length === 0) {
      return false;
    }

    // When the shaped glyphs do not cover the whole run text (e.g. a sub-run shaped
    // without glyph placements), decline so the renderer paints the full run with
    // native text — painting only the covered clusters would silently drop the rest.
    const coveredLength = clusters.reduce((total, cluster) => total + cluster.text.length, 0);
    if (coveredLength < command.text.length) {
      return false;
    }

    context.target.font = command.font;
    const mode = command.paintMode ?? "fill";
    if (
      (mode === "stroke" || mode === "fill-stroke") &&
      context.target.strokeText === undefined
    ) {
      return false;
    }
    context.target.fillStyle = command.fillStyle;
    if (mode === "stroke" || mode === "fill-stroke") {
      context.target.strokeStyle = command.strokeStyle ?? command.fillStyle;
      context.target.lineWidth = command.lineWidth ?? 1;
    }

    for (const cluster of clusters) {
      const x = command.origin.x + cluster.x;
      const y = command.origin.y + cluster.y;
      if (mode === "fill" || mode === "fill-stroke") {
        context.target.fillText(cluster.text, x, y);
      }
      if (mode === "stroke" || mode === "fill-stroke") {
        context.target.strokeText!(cluster.text, x, y);
      }
    }

    return true;
  }
}

/**
 * Creates a native Canvas text painter for shaped glyph-run clusters.
 *
 * @returns Glyph-run painter that draws source clusters at shaped offsets.
 */
export function createCanvasClusterGlyphRunPainter(): CanvasGlyphRunPainter {
  return new CanvasClusterGlyphRunPainter();
}

/**
 * Scripts whose shaping depends on neighbouring characters — cursive joining,
 * reordering, or combining marks — which per-cluster painting breaks. Covers
 * RTL/cursive (Hebrew, Arabic, Syriac, Thaana, NKo, Samaritan), Brahmic
 * (Devanagari–Sinhala), South-East Asian and Tibetan, Myanmar, Khmer/Philippine,
 * Mongolian, and Arabic/Hebrew presentation forms.
 */
const CONTEXTUAL_SHAPING_PATTERN =
  /[\u0590-\u08FF\u0900-\u0DFF\u0E00-\u0FFF\u1000-\u109F\u1700-\u18AF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;

/**
 * Returns whether a run's text needs whole-run shaping to render correctly.
 *
 * @param text - Glyph-run source text.
 * @returns True when the text contains a complex/cursive script.
 */
function textRequiresContextualShaping(text: string): boolean {
  return CONTEXTUAL_SHAPING_PATTERN.test(text);
}

/**
 * Resolves native text paint clusters from a glyph-run command.
 *
 * @param command - Glyph-run command to inspect.
 * @returns Text clusters in visual paint order.
 */
function resolveGlyphRunTextClusters(
  command: QuireGlyphRunCommand
): readonly CanvasGlyphRunTextCluster[] {
  const sourceRanges = resolveGlyphRunSourceRanges(command);
  const visualClusters = groupAdjacentGlyphRunVisualClusters(command.glyphs);
  const clusters: CanvasGlyphRunTextCluster[] = [];

  for (const visualCluster of visualClusters) {
    const range = sourceRanges.get(visualCluster.sourceCluster);

    if (!range) {
      continue;
    }

    const text = command.text.slice(range.from, range.to);

    if (text.length === 0) {
      continue;
    }

    clusters.push({
      sourceCluster: visualCluster.sourceCluster,
      text,
      x: visualCluster.firstGlyph.x + visualCluster.firstGlyph.xOffset,
      y: visualCluster.firstGlyph.y + visualCluster.firstGlyph.yOffset
    });
  }

  return clusters;
}

/**
 * Resolves logical source ranges for glyph-run source cluster offsets.
 *
 * @param command - Glyph-run command to inspect.
 * @returns Source ranges keyed by source cluster offset.
 */
function resolveGlyphRunSourceRanges(
  command: QuireGlyphRunCommand
): ReadonlyMap<number, CanvasGlyphRunSourceRange> {
  const starts = Array.from(new Set(
    command.glyphs
      .map((glyph) => normalizeGlyphSourceCluster(glyph.sourceCluster))
      .filter((sourceCluster): sourceCluster is number => sourceCluster !== null)
  ))
    .sort((first, second) => first - second);
  const ranges = new Map<number, CanvasGlyphRunSourceRange>();

  for (let index = 0; index < starts.length; index += 1) {
    const from = starts[index];

    if (from === undefined || from >= command.text.length) {
      continue;
    }

    const nextStart = starts[index + 1];
    const to = Math.min(nextStart ?? command.text.length, command.text.length);

    if (to <= from) {
      continue;
    }

    ranges.set(from, { from, to });
  }

  return ranges;
}

/**
 * Groups visually adjacent glyphs that share one source cluster.
 *
 * @param glyphs - Glyph placements in visual order.
 * @returns Visual clusters in paint order.
 */
function groupAdjacentGlyphRunVisualClusters(
  glyphs: readonly QuireGlyphRunGlyphPlacement[]
): readonly CanvasGlyphRunVisualCluster[] {
  const groups: CanvasGlyphRunVisualCluster[] = [];

  for (const glyph of glyphs) {
    const sourceCluster = normalizeGlyphSourceCluster(glyph.sourceCluster);

    if (sourceCluster === null) {
      continue;
    }

    const previous = groups.at(-1);

    if (previous?.sourceCluster === sourceCluster) {
      continue;
    }

    groups.push({
      sourceCluster,
      firstGlyph: glyph
    });
  }

  return groups;
}

/**
 * Normalizes a glyph source cluster into a usable source offset.
 *
 * @param sourceCluster - Raw source cluster value from the display command.
 * @returns Integer source offset, or null when invalid.
 */
function normalizeGlyphSourceCluster(sourceCluster: number): number | null {
  if (!Number.isFinite(sourceCluster) || sourceCluster < 0) {
    return null;
  }

  return Math.trunc(sourceCluster);
}
