import type { QuirePageColumnFragment, QuirePageFragment } from "../types";
import type {
  QuireMeasuredContainer,
  QuireMeasuredContainerSourceFragment
} from "../container";
import { isQuirePaginationItemAnchorAligned } from "./checkpoint";
import type {
  QuirePaginationCheckpoint,
  QuirePaginationCheckpointDelta,
  QuirePaginationItemAnchor,
  QuirePaginationPageRecord
} from "./types";

/**
 * Translates one retained page record into the current measured flow.
 *
 * @param record - Retained page record.
 * @param delta - Proven uniform translation.
 * @returns Translated page record.
 */
export function translateQuirePaginationPageRecord(
  record: QuirePaginationPageRecord,
  delta: QuirePaginationCheckpointDelta
): QuirePaginationPageRecord {
  return {
    fragment: translateQuirePaginationPageFragment(record.fragment, delta),
    start: translateQuirePaginationCheckpoint(record.start, delta),
    end: record.end === null ? null : translateQuirePaginationCheckpoint(record.end, delta),
    ...(record.endItem === undefined
      ? {}
      : { endItem: translateQuirePaginationItemAnchor(record.endItem, delta) })
  };
}

/**
 * Checks whether a translated record still points at current measured items.
 *
 * @param record - Translated record.
 * @param container - Current measured container.
 * @returns Whether all retained item anchors align.
 */
export function isQuirePaginationPageRecordAligned(
  record: QuirePaginationPageRecord,
  container: QuireMeasuredContainer
): boolean {
  return isQuirePaginationItemAnchorAligned(record.start.nextItem, container) &&
    (record.end === null || isQuirePaginationItemAnchorAligned(record.end.nextItem, container)) &&
    (record.endItem === undefined ||
      isQuirePaginationItemAnchorAligned(record.endItem, container));
}

/**
 * Checks whether suffix records carry opaque continuation payloads.
 *
 * @param records - Candidate retained suffix.
 * @returns Whether any boundary or page end carries continuation state.
 */
export function hasQuirePaginationContinuationState(
  records: readonly QuirePaginationPageRecord[]
): boolean {
  return records.some((record) =>
    record.start.continuationState !== undefined ||
    record.end?.continuationState !== undefined ||
    record.fragment.endInfo.continuationState !== undefined
  );
}

/**
 * Translates one retained page fragment's document and source-flow identities.
 *
 * Page-space rectangles stay fixed because convergence requires the same page
 * index and geometry key.
 *
 * @param fragment - Retained page fragment.
 * @param delta - Proven uniform translation.
 * @returns Translated page fragment.
 */
function translateQuirePaginationPageFragment(
  fragment: QuirePageFragment,
  delta: QuirePaginationCheckpointDelta
): QuirePageFragment {
  return {
    ...fragment,
    range: {
      from: fragment.range.from + delta.range,
      to: fragment.range.to + delta.range
    },
    ...(fragment.sourceFlowY === undefined
      ? {}
      : { sourceFlowY: fragment.sourceFlowY + delta.flow }),
    ...(fragment.sourceFragments === undefined
      ? {}
      : {
          sourceFragments: fragment.sourceFragments.map((source) =>
            translateQuirePaginationSourceFragment(source, delta)
          )
        }),
    ...(fragment.columns === undefined
      ? {}
      : {
          columns: fragment.columns.map((column) =>
            translateQuirePaginationColumnFragment(column, delta)
          )
        })
  };
}

/**
 * Translates one retained column's document and source-flow identities.
 *
 * @param column - Retained column fragment.
 * @param delta - Proven uniform translation.
 * @returns Translated column fragment.
 */
function translateQuirePaginationColumnFragment(
  column: QuirePageColumnFragment,
  delta: QuirePaginationCheckpointDelta
): QuirePageColumnFragment {
  return {
    ...column,
    range: {
      from: column.range.from + delta.range,
      to: column.range.to + delta.range
    },
    ...(column.sourceFlowY === undefined
      ? {}
      : { sourceFlowY: column.sourceFlowY + delta.flow }),
    ...(column.sourceFragments === undefined
      ? {}
      : {
          sourceFragments: column.sourceFragments.map((source) =>
            translateQuirePaginationSourceFragment(source, delta)
          )
        })
  };
}

/**
 * Translates one retained source fragment.
 *
 * @param source - Retained source fragment.
 * @param delta - Proven uniform translation.
 * @returns Translated source fragment.
 */
function translateQuirePaginationSourceFragment(
  source: QuireMeasuredContainerSourceFragment,
  delta: QuirePaginationCheckpointDelta
): QuireMeasuredContainerSourceFragment {
  return {
    ...source,
    ...(source.originOwnerPos === undefined
      ? {}
      : { originOwnerPos: source.originOwnerPos + delta.range }),
    range: {
      from: source.range.from + delta.range,
      to: source.range.to + delta.range
    },
    flowTop: source.flowTop + delta.flow,
    flowBottom: source.flowBottom + delta.flow
  };
}

/**
 * Translates one checkpoint and its measured-item anchor.
 *
 * @param checkpoint - Retained checkpoint.
 * @param delta - Proven uniform translation.
 * @returns Translated checkpoint.
 */
function translateQuirePaginationCheckpoint(
  checkpoint: QuirePaginationCheckpoint,
  delta: QuirePaginationCheckpointDelta
): QuirePaginationCheckpoint {
  return {
    ...checkpoint,
    nextItem: translateQuirePaginationItemAnchor(checkpoint.nextItem, delta)
  };
}

/**
 * Translates one measured-item anchor.
 *
 * @param anchor - Retained anchor.
 * @param delta - Proven uniform translation.
 * @returns Translated anchor.
 */
function translateQuirePaginationItemAnchor(
  anchor: QuirePaginationItemAnchor,
  delta: QuirePaginationCheckpointDelta
): QuirePaginationItemAnchor {
  return {
    ...anchor,
    index: anchor.index + delta.itemIndex,
    rangeFrom: anchor.rangeFrom + delta.range,
    rangeTo: anchor.rangeTo + delta.range,
    ...(anchor.flowTop === undefined ? {} : { flowTop: anchor.flowTop + delta.flow }),
    ...(anchor.flowBottom === undefined
      ? {}
      : { flowBottom: anchor.flowBottom + delta.flow })
  };
}
