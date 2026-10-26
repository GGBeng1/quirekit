import type { QuirePageEndInfo } from "../types";
import type { QuireMeasuredContainer } from "../container";
import type {
  QuirePaginationCheckpoint,
  QuirePaginationItemAnchor
} from "./types";

/**
 * Captures a measured-item anchor when the index is valid.
 *
 * @param container - Measured container that owns the item.
 * @param index - Item index to capture.
 * @returns Stable item facts, or undefined when the index is outside the container.
 */
export function createQuirePaginationItemAnchor(
  container: QuireMeasuredContainer,
  index: number
): QuirePaginationItemAnchor | undefined {
  const item = container.items[index];
  if (item === undefined) {
    return undefined;
  }

  return {
    index,
    id: item.id,
    rangeFrom: item.range.from,
    rangeTo: item.range.to,
    ...(item.flowTop === undefined ? {} : { flowTop: item.flowTop }),
    ...(item.flowBottom === undefined ? {} : { flowBottom: item.flowBottom }),
    height: item.height
  };
}

/**
 * Creates a renderer-neutral pagination checkpoint.
 *
 * @param options - Current container, resume cursor, end info, and geometry key.
 * @returns Checkpoint, or undefined when no next measured item exists.
 */
export function createQuirePaginationCheckpoint(options: {
  /** Current measured container. */
  readonly container: QuireMeasuredContainer;
  /** First item to consider on the next page. */
  readonly nextItemIndex: number;
  /** Next page index. */
  readonly pageIndex: number;
  /** Whether the next fragment starts at a page top. */
  readonly isPageTop: boolean;
  /** State carried across the page boundary. */
  readonly endInfo: QuirePageEndInfo;
  /** Geometry and pagination-policy key. */
  readonly geometryKey: string;
}): QuirePaginationCheckpoint | undefined {
  const nextItem = createQuirePaginationItemAnchor(
    options.container,
    options.nextItemIndex
  );
  if (nextItem === undefined) {
    return undefined;
  }

  return {
    nextItem,
    pageIndex: options.pageIndex,
    isPageTop: options.isPageTop,
    openMarks: options.endInfo.openMarks,
    openNodes: options.endInfo.openNodes,
    ...(options.endInfo.continuationState === undefined
      ? {}
      : { continuationState: options.endInfo.continuationState }),
    geometryKey: options.geometryKey
  };
}

/**
 * Restores page-driver end info from a checkpoint.
 *
 * @param checkpoint - Checkpoint whose continuation state should be restored.
 * @returns Page-driver end info.
 */
export function getQuirePaginationCheckpointEndInfo(
  checkpoint: QuirePaginationCheckpoint
): QuirePageEndInfo {
  return {
    openMarks: checkpoint.openMarks,
    openNodes: checkpoint.openNodes,
    ...(checkpoint.continuationState === undefined
      ? {}
      : { continuationState: checkpoint.continuationState })
  };
}

/**
 * Checks whether one retained anchor still matches a current measured item exactly.
 *
 * @param anchor - Retained measured-item anchor.
 * @param container - Current measured container.
 * @returns Whether every captured item fact still matches.
 */
export function isQuirePaginationItemAnchorAligned(
  anchor: QuirePaginationItemAnchor,
  container: QuireMeasuredContainer
): boolean {
  const current = createQuirePaginationItemAnchor(container, anchor.index);

  return current !== undefined &&
    current.id === anchor.id &&
    current.rangeFrom === anchor.rangeFrom &&
    current.rangeTo === anchor.rangeTo &&
    current.flowTop === anchor.flowTop &&
    current.flowBottom === anchor.flowBottom &&
    current.height === anchor.height;
}

/**
 * Rebinds a retained checkpoint to the current item after an exact prefix page.
 *
 * This is used only at the boundary after an unchanged prefix page. The page
 * itself remains exact; the first dirty item may change identity, height, range,
 * or source-flow coordinates. The caller therefore supplies the authoritative
 * current index immediately after the exact prefix page.
 *
 * @param checkpoint - Retained outgoing checkpoint.
 * @param container - Current measured container.
 * @param nextItemIndex - Current first item after the exact prefix page.
 * @returns Checkpoint carrying the current next-item anchor, or undefined when absent.
 */
export function rebaseQuirePaginationCheckpoint(
  checkpoint: QuirePaginationCheckpoint,
  container: QuireMeasuredContainer,
  nextItemIndex: number
): QuirePaginationCheckpoint | undefined {
  const current = createQuirePaginationItemAnchor(container, nextItemIndex);
  if (current === undefined) {
    return undefined;
  }

  return { ...checkpoint, nextItem: current };
}
