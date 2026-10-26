import type { ShapedRunData } from "../shaping";
import type { QuireTextCluster, QuireTextShapedGlyph } from "../types";

/**
 * Moves existing glyphs onto allocated cells without shaping or changing their scale.
 * @param group - Visual clusters with shared run ownership.
 * @param shaped - Immutable shaped positions and glyph identities.
 * @returns Run-local glyphs, or undefined when the ordinary paint path applies.
 */
export function collectCharacterGridGlyphs(
  group: readonly QuireTextCluster[], shaped: ShapedRunData
): QuireTextShapedGlyph[] | undefined {
  if (group[0]?.gridGroup === undefined) return undefined;
  const origin = group[0]!.x;
  const glyphs: QuireTextShapedGlyph[] = [];
  for (const cluster of group) {
    const source = shaped.glyphsByOffset.get(cluster.offset);
    if (!source?.length) continue;
    const left = Math.min(...source.map(glyph => glyph.x));
    for (const glyph of source) glyphs.push({ ...glyph,
      x: cluster.x - origin + (cluster.paintOffset ?? 0) + glyph.x - left });
  }
  return glyphs.sort((left, right) => left.x - right.x);
}

/**
 * Retains a native text block's ink origin separately from its caret allocation.
 * @param group - One native paint group in visual order.
 * @returns Optional inset and layout-only width delta for native painting.
 */
export function characterGridNativePaint(group: readonly QuireTextCluster[]): {
  readonly paintOffset?: number; readonly trailingSpacing?: number;
} {
  if (group[0]?.gridGroup === undefined) return {};
  return { paintOffset: group[0]!.paintOffset ?? 0,
    trailingSpacing: group.reduce((sum, cluster) => sum + cluster.advance - (cluster.naturalAdvance ?? cluster.advance), 0) };
}
