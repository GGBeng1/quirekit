import type { QuirePageFragment } from "../types";
import type {
  QuireMeasuredContainer,
  QuireMeasuredContainerPageLeadingBand,
  QuireMeasuredContainerSourceFragment
} from "../container";
import type { QuireAcceptedPageFragmentOptions, QuireAcceptedSourceContext } from "./types";

/**
 * Creates a page fragment from one accepted measured-container result.
 *
 * @param options - Accepted result, geometry, and source-fragment context.
 * @returns Page fragment carrying source-flow and continuation metadata.
 */
export function createQuireAcceptedPageFragment(
  options: QuireAcceptedPageFragmentOptions
): QuirePageFragment {
  const collectSourceContext = options.collectSourceContext ?? true;
  const collectSourceFragments = options.collectSourceFragments ?? true;
  const hasResultSourceFlowBand =
    collectSourceContext &&
    options.result.sourceFlowTop !== undefined &&
    options.result.sourceFlowBottom !== undefined;
  const resultSourceFragments = collectSourceContext && collectSourceFragments
    ? options.result.sourceFragments
    : undefined;
  const hasResultSourceFragments =
    collectSourceContext &&
    resultSourceFragments !== undefined && resultSourceFragments.length > 0;
  const fallbackSourceContext =
    !collectSourceContext || hasResultSourceFlowBand || hasResultSourceFragments
    ? null
    : collectQuireAcceptedSourceContext(
        options.container,
        options.startIndex,
        options.result.nextIndex,
        collectSourceFragments
      );
  const sourceFlowBand = hasResultSourceFlowBand
    ? {
        top: options.result.sourceFlowTop!,
        bottom: options.result.sourceFlowBottom!
      }
    : fallbackSourceContext?.sourceFlowBand ?? null;
  const sourceFragments = hasResultSourceFragments
    ? resultSourceFragments
    : fallbackSourceContext?.sourceFragments;

  return {
    pageIndex: options.pageIndex,
    range: options.result.range,
    pageRect: options.geometry.pageRect,
    bodyRect: options.geometry.bodyRect,
    rect: {
      x: options.geometry.bodyRect.x,
      y: options.geometry.bodyRect.y,
      width: options.geometry.bodyRect.width,
      height: (options.pageLeadingBand?.height ?? 0) +
        options.result.consumedHeight
    },
    ...(sourceFlowBand === null
      ? {}
      : {
          sourceFlowY: sourceFlowBand.top,
          sourceFlowHeight: sourceFlowBand.bottom - sourceFlowBand.top
        }),
    ...(sourceFragments === undefined || sourceFragments.length === 0
      ? {}
      : { sourceFragments }),
    endInfo: mergeQuirePageLeadingBandState(
      options.result.endInfo,
      options.pageLeadingBand
    ),
    ...(options.result.notes === undefined
      ? {}
      : { notes: options.result.notes, noteAreaHeight: options.result.noteAreaHeight })
  };
}

/**
 * Resolves the capability-owned band that should be reserved before a page.
 *
 * @param container - Measured container being driven across pages.
 * @param startIndex - First measured item attempted on the page.
 * @returns Page-leading band for the page, or null when none applies.
 */
export function resolveQuirePageLeadingBandForPage(
  container: QuireMeasuredContainer,
  startIndex: number
): QuireMeasuredContainerPageLeadingBand | null {
  return container.items[startIndex]?.pageLeadingBand ?? null;
}

/**
 * Projects one page-leading band's explicit capability state onto page end info.
 *
 * @param endInfo - Base page end info returned by measured pagination.
 * @param pageLeadingBand - Capability-owned band reserved before body content.
 * @returns End info carrying the band's explicit continuation state.
 */
function mergeQuirePageLeadingBandState(
  endInfo: QuirePageFragment["endInfo"],
  pageLeadingBand: QuireMeasuredContainerPageLeadingBand | null
): QuirePageFragment["endInfo"] {
  if (pageLeadingBand === null) {
    return endInfo;
  }

  return {
    ...endInfo,
    continuationState: {
      ...(endInfo.continuationState ?? {}),
      ...pageLeadingBand.continuationState
    }
  };
}

/**
 * Collects source-flow metadata accepted into one page fragment.
 *
 * @param container - Measured container being paginated.
 * @param startIndex - First accepted measured item index.
 * @param endIndex - Exclusive accepted measured item index.
 * @param collectSourceFragments - Whether accepted item provenance should be collected.
 * @returns Source-flow band and fragments contributed by accepted items.
 */
function collectQuireAcceptedSourceContext(
  container: QuireMeasuredContainer,
  startIndex: number,
  endIndex: number,
  collectSourceFragments: boolean
): QuireAcceptedSourceContext {
  const sourceFragments: QuireMeasuredContainerSourceFragment[] = [];
  const normalizedEndIndex = Math.max(startIndex, endIndex);
  let sourceFlowTop = Number.POSITIVE_INFINITY;
  let sourceFlowBottom = Number.NEGATIVE_INFINITY;

  for (let index = startIndex; index < normalizedEndIndex; index += 1) {
    const item = container.items[index];
    if (item === undefined) {
      continue;
    }

    if (item.flowTop !== undefined && item.flowBottom !== undefined) {
      sourceFlowTop = Math.min(sourceFlowTop, item.flowTop);
      sourceFlowBottom = Math.max(sourceFlowBottom, item.flowBottom);
    }

    if (!collectSourceFragments) {
      continue;
    }

    const itemSourceFragments = item.sourceFragments;
    if (itemSourceFragments === undefined) {
      continue;
    }

    for (let sourceIndex = 0; sourceIndex < itemSourceFragments.length; sourceIndex += 1) {
      sourceFragments.push(itemSourceFragments[sourceIndex]!);
    }
  }

  return {
    sourceFlowBand: sourceFlowTop === Number.POSITIVE_INFINITY
      ? null
      : {
          top: sourceFlowTop,
          bottom: sourceFlowBottom
        },
    sourceFragments
  };
}
