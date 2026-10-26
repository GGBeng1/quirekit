import {
  cloneQuireTextFragmentWithLazyCaretStops,
  markQuireTextFragmentsSortedByLineTop,
  type QuireTextFragment
} from "../text";
import type {
  QuireBlockFlowBox,
  QuireBlockFlowInput,
  QuireBlockFlowServices
} from "./types";

/**
 * Translates local text fragments without reopening their caret geometry.
 *
 * @param fragments - Local fragments to translate.
 * @param dx - Horizontal parent offset.
 * @param dy - Vertical parent offset.
 * @param cache - Optional translation cache.
 * @returns Parent-coordinate fragments.
 */
export function translateBlockFlowTextFragments<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
>(
  fragments: readonly QuireTextFragment[],
  dx: number,
  dy: number,
  cache: QuireBlockFlowServices<Input, Box>["cache"]
): readonly QuireTextFragment[] {
  if (dx === 0 && dy === 0) {
    return fragments;
  }

  return markQuireTextFragmentsSortedByLineTop(fragments.map((fragment) =>
    cache?.translateTextFragment?.(fragment, dx, dy)
      ?? translateTextFragment(fragment, dx, dy)
  ));
}

/**
 * Measures local text height while translating fragments into parent space.
 *
 * @param fragments - Optional local fragments.
 * @param dx - Horizontal parent offset.
 * @param dy - Vertical parent offset.
 * @param cache - Optional translation cache.
 * @returns Translated fragments and their local content height.
 */
export function measureBlockFlowTextFragments<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
>(
  fragments: readonly QuireTextFragment[] | undefined,
  dx: number,
  dy: number,
  cache: QuireBlockFlowServices<Input, Box>["cache"]
): {
  readonly textFragments?: readonly QuireTextFragment[] | undefined;
  readonly textHeight: number;
} {
  if (fragments === undefined || fragments.length === 0) {
    return { textHeight: 0 };
  }

  let textHeight = 0;
  const translated: QuireTextFragment[] = [];
  for (const fragment of fragments) {
    textHeight = Math.max(textHeight, fragment.rect.y + fragment.lineHeight);
    translated.push(
      dx === 0 && dy === 0
        ? fragment
        : cache?.translateTextFragment?.(fragment, dx, dy)
          ?? translateTextFragment(fragment, dx, dy)
    );
  }

  return {
    textFragments: markQuireTextFragmentsSortedByLineTop(translated),
    textHeight
  };
}

/**
 * Translates one local text fragment into parent coordinates.
 *
 * @param fragment - Local source fragment.
 * @param dx - Horizontal parent offset.
 * @param dy - Vertical parent offset.
 * @returns Parent-coordinate fragment.
 */
function translateTextFragment(
  fragment: QuireTextFragment,
  dx: number,
  dy: number
): QuireTextFragment {
  return cloneQuireTextFragmentWithLazyCaretStops({
    source: fragment,
    id: fragment.id,
    range: fragment.range,
    rect: {
      ...fragment.rect,
      x: fragment.rect.x + dx,
      y: fragment.rect.y + dy
    },
    baseline: fragment.baseline + dy
  });
}
