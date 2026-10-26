import type {
  QuireMeasuredContainerItem,
  QuireMeasuredContainerPaginationOptions,
  QuireMeasuredContainerPaginationResult,
  QuireMeasuredContainerSourceContextBuilder
} from "./types";

/**
 * Creates a source-context builder when the caller requested one.
 *
 * @param options - Pagination options for the current page fragment.
 * @returns Mutable builder, or null when collection is disabled.
 */
export function createQuireMeasuredContainerSourceContextBuilder(
  options: QuireMeasuredContainerPaginationOptions
): QuireMeasuredContainerSourceContextBuilder | null {
  return options.collectSourceContext === true
    ? {
        sourceFlowTop: Number.POSITIVE_INFINITY,
        sourceFlowBottom: Number.NEGATIVE_INFINITY,
        sourceFragments: options.collectSourceFragments === false ? null : []
      }
    : null;
}

/**
 * Adds one accepted item to the optional source-context builder.
 *
 * @param builder - Mutable source-context builder, or null when disabled.
 * @param item - Accepted measured item.
 * @returns Nothing.
 */
export function appendQuireMeasuredContainerSourceContext(
  builder: QuireMeasuredContainerSourceContextBuilder | null,
  item: QuireMeasuredContainerItem
): void {
  if (builder === null) {
    return;
  }

  if (item.flowTop !== undefined && item.flowBottom !== undefined) {
    builder.sourceFlowTop = Math.min(builder.sourceFlowTop, item.flowTop);
    builder.sourceFlowBottom = Math.max(builder.sourceFlowBottom, item.flowBottom);
  }

  // A flow-only result must not invoke provenance getters or allocate a list.
  if (builder.sourceFragments === null) {
    return;
  }

  const sourceFragments = item.sourceFragments;
  if (sourceFragments === undefined) {
    return;
  }

  for (let index = 0; index < sourceFragments.length; index += 1) {
    builder.sourceFragments.push(sourceFragments[index]!);
  }
}

/**
 * Attaches collected source context to an accepted pagination result.
 *
 * @param result - Pagination result to return.
 * @param builder - Mutable source-context builder, or null when disabled.
 * @returns Result with optional source context attached.
 */
export function withQuireMeasuredContainerSourceContext<Result extends
  QuireMeasuredContainerPaginationResult>(
  result: Result,
  builder: QuireMeasuredContainerSourceContextBuilder | null
): Result {
  if (builder === null) {
    return result;
  }

  const hasSourceFlowBand = builder.sourceFlowTop !== Number.POSITIVE_INFINITY;
  const hasSourceFragments = builder.sourceFragments !== null && builder.sourceFragments.length > 0;

  if (!hasSourceFlowBand && !hasSourceFragments) {
    return result;
  }

  return {
    ...result,
    ...(hasSourceFlowBand
      ? {
          sourceFlowTop: builder.sourceFlowTop,
          sourceFlowBottom: builder.sourceFlowBottom
        }
      : {}),
    ...(hasSourceFragments ? { sourceFragments: builder.sourceFragments! } : {})
  };
}
