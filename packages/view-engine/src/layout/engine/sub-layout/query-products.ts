import type { QuireRect } from "@quirekit/renderer";
import type { QuireChildFlowFragment } from "@quirekit/layout/child-flow";
import type {
  QuireSubLayoutCaretStop,
  QuireSubLayoutFragmentSource,
  QuireSubLayoutInputAnchor,
  QuireSubLayoutQueryProducts,
  QuireSubLayoutSelectionRect
} from "./types";
import type { QuireLayoutBox, QuireHitTarget } from "../types";
import {
  resolveQuireTextFragmentRunRect,
  type QuireTextFragment
} from "@quirekit/layout/text";

/** Caret width used for canonical sub-layout query products. */
const subLayoutCaretWidth = 1;

/**
 * Creates canonical query products from accepted sub-layout child fragments.
 *
 * @param childFragments - Accepted child fragments that own text geometry.
 * @param interactionRect - Optional interaction rectangle for trailing blank hits.
 * @param fragmentSources - Retained source boxes keyed by child fragment id.
 * @returns Selection, caret, hit-test, and input-anchor products.
 */
export function createQuireSubLayoutQueryProducts(
  childFragments: readonly QuireChildFlowFragment[],
  interactionRect?: QuireRect | undefined,
  fragmentSources: readonly QuireSubLayoutFragmentSource[] = []
): QuireSubLayoutQueryProducts {
  const sourceByFragmentId = new Map(
    fragmentSources.map((source) => [source.fragmentId, source.sourceBox])
  );
  const selectionRects: QuireSubLayoutSelectionRect[] = [];
  const caretStops: QuireSubLayoutCaretStop[] = [];
  const inputAnchors: QuireSubLayoutInputAnchor[] = [];
  const hitTargets: QuireHitTarget[] = childFragments.map((fragment) => ({
    id: `${fragment.id}:sub-layout-hit`,
    range: fragment.range,
    rect: fragment.rect
  }));
  const trailingHitTarget = interactionRect === undefined
    ? null
    : createQuireSubLayoutTrailingBlankHitTarget(
        childFragments,
        interactionRect
      );

  if (trailingHitTarget !== null) {
    hitTargets.push(trailingHitTarget);
  }

  for (const childFragment of childFragments) {
    const textFragments = collectQuireSubLayoutChildTextFragments(
      childFragment,
      sourceByFragmentId.get(childFragment.id)
    );

    for (const textFragment of textFragments) {
      selectionRects.push(createQuireSubLayoutSelectionRect(textFragment));
      const runRect = resolveQuireTextFragmentRunRect(textFragment);

      for (const caretStop of textFragment.caretStops) {
        const rect = {
          x: textFragment.rect.x + caretStop.localX,
          y: runRect.y,
          width: subLayoutCaretWidth,
          height: runRect.height
        };

        caretStops.push({
          textFragmentId: textFragment.id,
          position: caretStop.position,
          rect,
          lineBaseline: textFragment.baseline,
          fragmentId: childFragment.id
        });
        inputAnchors.push({
          position: caretStop.position,
          rect,
          role: "caret"
        });
      }
    }
  }

  return {
    selectionRects,
    caretStops,
    hitTargets,
    inputAnchors
  };
}

/**
 * Creates a root-level hit target that maps trailing blank space to the last child.
 *
 * @param childFragments - Accepted child fragments in visual/source order.
 * @param interactionRect - Root interaction rectangle in parent coordinates.
 * @returns Trailing blank hit target, or null when no child can own it.
 */
function createQuireSubLayoutTrailingBlankHitTarget(
  childFragments: readonly QuireChildFlowFragment[],
  interactionRect: QuireRect
): QuireHitTarget | null {
  const trailingFragment = childFragments.at(-1);

  if (trailingFragment === undefined) {
    return null;
  }

  const trailingTextFragment = collectQuireSubLayoutChildTextFragments(
    trailingFragment,
    undefined
  ).at(-1);
  const trailingRect = trailingTextFragment?.rect ?? trailingFragment.rect;
  const interactionBottom = interactionRect.y + interactionRect.height;
  const trailingTop = Math.max(interactionRect.y, trailingRect.y);
  const trailingHeight = interactionBottom - trailingTop;

  if (trailingHeight <= 0) {
    return null;
  }

  return {
    id: `${trailingFragment.id}:sub-layout-trailing-blank-hit`,
    range: trailingFragment.range,
    rect: {
      ...interactionRect,
      y: trailingTop,
      height: trailingHeight
    }
  };
}

/**
 * Collects text fragments owned by one sub-layout child fragment.
 *
 * @param fragment - Accepted sub-layout child fragment.
 * @param sourceBox - Optional source box retaining nested text geometry.
 * @returns Text fragments from the retained source box tree or direct fragment.
 */
function collectQuireSubLayoutChildTextFragments(
  fragment: QuireChildFlowFragment,
  sourceBox: QuireLayoutBox | undefined
): readonly QuireTextFragment[] {
  return sourceBox === undefined
    ? fragment.textFragments ?? []
    : collectQuireLayoutBoxTextFragments(sourceBox);
}

/**
 * Collects text fragments from a layout box subtree in visual/source order.
 *
 * @param box - Layout box subtree to inspect.
 * @returns Text fragments owned by the box and descendants.
 */
function collectQuireLayoutBoxTextFragments(
  box: QuireLayoutBox
): readonly QuireTextFragment[] {
  const textFragments: QuireTextFragment[] = [
    ...(box.textFragments ?? [])
  ];
  const children = readQuireLayoutBoxChildren(box);

  for (const child of children) {
    textFragments.push(...collectQuireLayoutBoxTextFragments(child));
  }

  return textFragments;
}

/**
 * Reads child layout boxes from a possibly-container layout box.
 *
 * @param box - Layout box to inspect.
 * @returns Child layout boxes, or an empty array for leaves.
 */
function readQuireLayoutBoxChildren(
  box: QuireLayoutBox
): readonly QuireLayoutBox[] {
  const candidate = box as QuireLayoutBox & {
    readonly children?: readonly QuireLayoutBox[] | undefined;
  };

  return candidate.children ?? [];
}

/**
 * Creates the full-fragment selection rectangle exposed by query products.
 *
 * @param textFragment - Text fragment accepted into the sub-layout result.
 * @returns Selection rectangle covering the text fragment range.
 */
function createQuireSubLayoutSelectionRect(
  textFragment: QuireTextFragment
): QuireSubLayoutSelectionRect {
  return {
    textFragmentId: textFragment.id,
    range: textFragment.range,
    rect: {
      x: textFragment.rect.x,
      y: textFragment.rect.y,
      width: textFragment.rect.width,
      height: textFragment.lineHeight
    }
  };
}
