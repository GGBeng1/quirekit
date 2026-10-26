import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutBox } from "../../layout/engine/types";
import { clipQuireSubLayoutTextLine } from "../../layout/engine/sub-layout/text-line-clip";

/**
 * Keeps a transformed subtree complete after its visual envelope is accepted.
 * Descendant rectangles precede the root's affine transform; pruning those
 * source-space rows against the document window would discard visible ink.
 *
 * @param box - Accepted layout occurrence whose descendants will be adapted.
 * @param clipRects - Active snapshot window in document coordinates.
 * @returns The compatible clip window, or no source-space pruning under a transform.
 */
export function resolveLayoutSnapshotClipRects(
  box: QuireLayoutBox,
  clipRects: readonly QuireRect[] | undefined
): readonly QuireRect[] | undefined {
  return box.paintTransform === undefined ? clipRects : undefined;
}

/**
 * Clips direct text fragments before mounted render consumers traverse them.
 *
 * @param textFragments - Text fragments owned by the layout box.
 * @param clipRects - Active snapshot clip rectangles, or undefined.
 * @returns The original fragments when unclipped, or only intersecting fragments.
 */
export function clipLayoutTextFragments(
  textFragments: QuireLayoutBox["textFragments"],
  clipRects: readonly QuireRect[] | undefined
): QuireLayoutBox["textFragments"] {
  if (textFragments === undefined || clipRects === undefined) {
    return textFragments;
  }

  // Empty paragraphs own a caret line despite having no painted area. Reuse
  // retained text-line visibility without clipping the source caret metrics.
  const clippedFragments = textFragments.filter((fragment) =>
    clipRects.some((clip) => clipQuireSubLayoutTextLine(fragment.rect, clip) !== null)
  );

  return clippedFragments.length === textFragments.length
    ? textFragments
    : clippedFragments;
}
