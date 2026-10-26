import type { QuireMarkCanvasStyleResolver, QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { Mark as ProseMirrorMark } from "@quirekit/pm";
import { styleDeltas } from "./shared";
import type { QuireMarkTextDecoration } from "./types";

/**
 * Resolves the explicit Word-compatible direction of one marked source run.
 *
 * Explicit false remains stored in the model but has the same visual direction
 * as absence. Last write wins in mark order, matching other scalar style fields.
 *
 * @param marks - Marks applied to the inline run.
 * @param resolveMarkStyle - Optional resolver for per-mark canvas style deltas.
 * @param nodeStyle - Inherited textblock and semantic style properties.
 * @returns Right-to-left override when active, otherwise undefined.
 */
export function resolveQuireMarkedRunDirection(
  marks: readonly ProseMirrorMark[],
  resolveMarkStyle?: QuireMarkCanvasStyleResolver,
  nodeStyle?: QuireNodeCanvasTextStyle | null
): "rtl" | undefined {
  let rightToLeft: boolean | undefined;
  for (const delta of styleDeltas(marks, resolveMarkStyle, nodeStyle)) {
    const value = delta.rightToLeft;
    if (typeof value === "boolean") rightToLeft = value;
  }
  return rightToLeft === true ? "rtl" : undefined;
}

/**
 * Resolves the set of text-decoration lines for a run from its marks.
 *
 * Decoration lines accumulate as a set (CSS `text-decoration-line`): underline
 * and strike can coexist; duplicates are dropped.
 *
 * @param marks - Marks applied to the inline run.
 * @param resolveMarkStyle - Optional resolver for per-mark canvas style deltas.
 * @param nodeStyle - Inherited textblock and semantic style properties.
 * @returns Ordered unique decoration lines, or undefined when none apply.
 */
export function resolveQuireMarkedTextDecoration(
  marks: readonly ProseMirrorMark[],
  resolveMarkStyle?: QuireMarkCanvasStyleResolver,
  nodeStyle?: QuireNodeCanvasTextStyle | null
): readonly QuireMarkTextDecoration[] | undefined {
  const lines: QuireMarkTextDecoration[] = [];

  for (const delta of styleDeltas(marks, resolveMarkStyle, nodeStyle)) {
    if (delta.underline?.style === "none") { const index = lines.indexOf("underline"); if (index >= 0) lines.splice(index, 1); }
    for (const line of delta.textDecoration ?? []) {
      if (!lines.includes(line)) {
        lines.push(line);
      }
    }
  }

  return lines.length > 0 ? lines : undefined;
}

/**
 * Resolves the final visual text transform contributed by inline marks.
 *
 * @param marks - Marks applied to the inline run.
 * @param resolveMarkStyle - Optional resolver for per-mark canvas style deltas.
 * @param nodeStyle - Inherited textblock and semantic style properties.
 * @returns Last declared transform, defaulting to none.
 */
export function resolveQuireMarkedTextTransform(
  marks: readonly ProseMirrorMark[],
  resolveMarkStyle?: QuireMarkCanvasStyleResolver,
  nodeStyle?: QuireNodeCanvasTextStyle | null
): "none" | "uppercase" {
  let transform: "none" | "uppercase" = "none";
  for (const delta of styleDeltas(marks, resolveMarkStyle, nodeStyle)) {
    const value = delta.textTransform;
    if (value !== undefined) transform = value;
  }
  return transform;
}
