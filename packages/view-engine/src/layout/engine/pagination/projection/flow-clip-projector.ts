import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { resolveQuireTextFragmentFlowOffsetY } from "@quirekit/layout/pagination";
import type { QuireLayoutBox, QuireLayoutContainer } from "../../types";
import { isQuireLayoutContainer } from "./guards";
import { clipQuireRectToSourceFlowRect } from "./source-flow";
import { translateQuireRect } from "./translate";
import { createProjectedLayoutBoxBase } from "./flow-clip/box";
import { readProjectedSourceTextFragments, translateQuireTextFragmentWithFlowOffset } from "./flow-clip/text";
import { expandQuireProjectionRectUnion, expandQuireProjectionRangeUnion } from "./flow-clip/union";
import type { QuireFlowClipLayoutBoxProjectionOptions } from "./flow-clip/types";

/**
 * Projects one layout box subtree by visual intersection with a flow-space clip.
 *
 * The parent fragment owns placement and clipping. Nested text keeps baseline
 * ownership inside that clip, and retained continuation lines are locally
 * rebased when their ink starts above the clip top.
 *
 * @param options - Source box, page projection, flow clip, optional id override, and suffix.
 * @returns Projected box, or an empty list when no visible content intersects the clip.
 */
export function projectQuireLayoutBoxToFlowClip(
  options: QuireFlowClipLayoutBoxProjectionOptions
): readonly QuireLayoutBox[] {
  const sourceTextFragments = readProjectedSourceTextFragments(options);
  const textFlowOffsetY = options.retainPartialText ? 0 : resolveQuireTextFragmentFlowOffsetY(
    sourceTextFragments,
    options.flowClip
  );
  const textFragments: QuireTextFragment[] = [];
  const children: QuireLayoutBox[] = [];
  let unionRect: QuireRect | null = null;
  let unionRange: QuireDocumentRange | null = null;

  for (let index = 0; index < sourceTextFragments.length; index += 1) {
    const fragment = translateQuireTextFragmentWithFlowOffset(
      sourceTextFragments[index]!,
      options.projection,
      textFlowOffsetY
    );

    textFragments.push(fragment);
    unionRect = expandQuireProjectionRectUnion(unionRect, fragment.rect);
    unionRange = expandQuireProjectionRangeUnion(unionRange, fragment.range);
  }

  if (isQuireLayoutContainer(options.box)) {
    for (let index = 0; index < options.box.children.length; index += 1) {
      const projectedChildren = projectQuireLayoutBoxToFlowClip({
        box: options.box.children[index]!,
        projection: options.projection,
        flowClip: options.flowClip,
        rectClip: options.rectClip,
        retainPartialText: options.retainPartialText,
        suffix: options.suffix
      });

      for (let childIndex = 0; childIndex < projectedChildren.length; childIndex += 1) {
        const child = projectedChildren[childIndex]!;
        children.push(child);
        unionRect = expandQuireProjectionRectUnion(unionRect, child.rect);
        unionRange = expandQuireProjectionRangeUnion(unionRange, child.range);
      }
    }
  }

  if (textFragments.length === 0 && children.length === 0) {
    return [];
  }

  const clippedRect = clipQuireRectToSourceFlowRect(
    options.box.rect,
    options.flowClip,
    options.rectClip
  );
  const rect = clippedRect === null
    ? unionRect
    : translateQuireRect(clippedRect, options.projection);
  const range = unionRange;

  if (rect === null || range === null) {
    return [];
  }

  const projectedBase = createProjectedLayoutBoxBase({
    box: options.box,
    id: options.id ?? `${options.box.id}${options.suffix}`,
    range,
    rect,
    projection: options.projection,
    flowClip: options.flowClip,
    rectClip: options.rectClip,
    retainPartialText: options.retainPartialText
  });

  if (isQuireLayoutContainer(options.box)) {
    const projected: QuireLayoutContainer = {
      ...projectedBase,
      ...(textFragments.length === 0 ? {} : { textFragments }),
      children
    };

    return [projected];
  }

  return [{
    ...projectedBase,
    textFragments
  }];
}
