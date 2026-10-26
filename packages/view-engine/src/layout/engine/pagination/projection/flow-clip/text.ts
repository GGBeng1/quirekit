import type { QuireTextFragment } from "@quirekit/layout/text";
import { doesQuireTextFragmentBaselineBelongToFlowBand } from "@quirekit/layout/pagination";
import { readQuireLazyShiftedTextFragments, shiftQuireTextFragment } from "../../../lazy-text-fragments";
import { clipQuireSubLayoutTextLine } from "../../../sub-layout/text-line-clip";
import { translateQuireTextFragment } from "../translate";
import type { QuirePageBodyProjection } from "../types";
import type { QuireFlowClipLayoutBoxProjectionOptions } from "./types";

/**
 * Reads accepted fragments in current flow coordinates without moving clipped ink.
 * @param options - Source box, flow band, parent clip and overflow policy.
 * @returns Fragments owned by the page or visibly intersecting a fixed frame.
 */
export function readProjectedSourceTextFragments(
  options: QuireFlowClipLayoutBoxProjectionOptions
): readonly QuireTextFragment[] {
  const lazy = readQuireLazyShiftedTextFragments(options.box);
  const accepted: QuireTextFragment[] = [];
  for (const source of lazy?.sourceFragments ?? options.box.textFragments ?? []) {
    const dy = lazy?.dy ?? 0;
    const rect = dy === 0 ? source.rect : { ...source.rect, y: source.rect.y + dy };
    // Pagination owns whole lines by baseline. Fixed frames instead own the
    // visible intersection, including ink whose baseline lies below the frame.
    const inBand = options.retainPartialText
      ? rect.y < options.flowClip.bottom && rect.y + rect.height > options.flowClip.top
      : doesQuireTextFragmentBaselineBelongToFlowBand(
          dy === 0 ? source : { ...source, baseline: source.baseline + dy }, options.flowClip
        );
    if (!inBand || (options.rectClip !== undefined && clipQuireSubLayoutTextLine(rect, options.rectClip) === null)) continue;
    accepted.push(lazy === undefined ? source : shiftQuireTextFragment(source, dy, lazy.rangeDelta));
  }
  return accepted;
}

/**
 * Translates a retained text fragment by page placement and continuation rebase.
 * @param fragment - Source text fragment.
 * @param projection - Page placement.
 * @param flowOffsetY - Continuation-only vertical rebase; zero for fixed clipping.
 * @returns Projected text fragment with its original ink and baseline relation.
 */
export function translateQuireTextFragmentWithFlowOffset(
  fragment: QuireTextFragment,
  projection: QuirePageBodyProjection,
  flowOffsetY: number
): QuireTextFragment {
  return translateQuireTextFragment(flowOffsetY === 0 ? fragment : {
    ...fragment, rect: { ...fragment.rect, y: fragment.rect.y + flowOffsetY },
    baseline: fragment.baseline + flowOffsetY
  }, projection);
}
