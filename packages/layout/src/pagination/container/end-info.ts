import type { QuirePageEndInfo } from "../types";

/**
 * Merges incoming page end info with item-local end info.
 *
 * @param incoming - Resume state carried into the current item.
 * @param itemEndInfo - Resume state recorded at the end of the current item.
 * @returns Resume state to expose at the accepted fragment end.
 */
export function mergeQuireMeasuredContainerEndInfo(
  incoming: QuirePageEndInfo,
  itemEndInfo: QuirePageEndInfo | undefined
): QuirePageEndInfo {
  if (itemEndInfo === undefined) {
    return incoming;
  }

  return {
    openMarks: itemEndInfo.openMarks,
    openNodes: itemEndInfo.openNodes,
    ...mergeQuireMeasuredContainerContinuationState(incoming, itemEndInfo)
  };
}

/**
 * Merges feature-owned continuation payloads shallowly by feature key.
 *
 * @param incoming - Resume state carried into the current item.
 * @param itemEndInfo - Resume state recorded at the end of the current item.
 * @returns Optional continuation state property for the merged resume state.
 */
function mergeQuireMeasuredContainerContinuationState(
  incoming: QuirePageEndInfo,
  itemEndInfo: QuirePageEndInfo
): Pick<QuirePageEndInfo, "continuationState"> {
  if (
    incoming.continuationState === undefined &&
    itemEndInfo.continuationState === undefined
  ) {
    return {};
  }

  return {
    continuationState: {
      ...(incoming.continuationState ?? {}),
      ...(itemEndInfo.continuationState ?? {})
    }
  };
}
