import type { QuireTextFragment } from "@quirekit/layout/text";
import { fragmentRowStart } from "./rows";

const defaultCheckpointLineLookback = 1;

/** Retained per-line ranges used by textblock tail checkpoints. */
export interface QuireTextblockTailLineCheckpoints {
  /** Text start offsets, relative to content start, for each visual line. */
  readonly fromOffsets: readonly number[];
  /** Text end offsets, relative to content start, for each visual line. */
  readonly toOffsets: readonly number[];
  /** Local y coordinates for each visual line. */
  readonly yCoordinates: readonly number[];
}

/** Checkpoint where retained prefix fragments stop and suffix layout restarts. */
export interface QuireTextblockTailCheckpoint {
  /** Previous fragment array that owns the retained prefix. */
  readonly sourceFragments: readonly QuireTextFragment[];
  /** Exclusive fragment index where the retained prefix stops. */
  readonly prefixEndIndex: number;
  /** Text offset, relative to content start, where suffix layout restarts. */
  readonly textOffset: number;
  /** Local y coordinate for the restarted line. */
  readonly y: number;
}

/**
 * Finds a safe retained-prefix checkpoint before the affected local-edit line.
 *
 * @param fragments - Previous retained fragments.
 * @param contentStart - Absolute document position at block content start.
 * @param affectedOffset - Text offset where the local edit begins.
 * @param lineCheckpoints - Optional retained line checkpoint metadata.
 * @param lineLookback - Number of previous visual lines that must be included.
 * @returns Prefix fragments and restart origin, or undefined when unsafe.
 */
export function findQuireTextblockTailReuseCheckpoint(
  fragments: readonly QuireTextFragment[],
  contentStart: number,
  affectedOffset: number,
  lineCheckpoints?: QuireTextblockTailLineCheckpoints | undefined,
  lineLookback = defaultCheckpointLineLookback
): QuireTextblockTailCheckpoint | undefined {
  const checkpoints =
    lineCheckpoints ??
    createQuireTextblockTailLineCheckpoints(fragments, contentStart);
  if (checkpoints === undefined) {
    return undefined;
  }

  const lineIndex = findCheckpointLineIndexAtOffset(
    checkpoints.fromOffsets,
    affectedOffset
  );
  if (lineIndex === undefined) {
    return undefined;
  }

  let checkpointIndex = fragmentRowStart(fragments, lineIndex);
  for (let back = 0; back < lineLookback && checkpointIndex > 0; back++) {
    checkpointIndex = fragmentRowStart(fragments, checkpointIndex - 1);
  }
  const checkpointFragment = fragments[checkpointIndex];
  if (checkpointFragment === undefined) {
    return undefined;
  }

  const textOffset = checkpoints.fromOffsets[checkpointIndex];
  const y = checkpoints.yCoordinates[checkpointIndex];
  if (
    textOffset === undefined ||
    y === undefined ||
    textOffset < 0 ||
    textOffset > affectedOffset ||
    !Number.isFinite(y)
  ) {
    return undefined;
  }

  return {
    sourceFragments: fragments,
    prefixEndIndex: checkpointIndex,
    textOffset,
    y
  };
}

/**
 * Creates retained line checkpoint metadata for simple textblock fragments.
 *
 * @param fragments - Previous retained fragments.
 * @param contentStart - Absolute document position at block content start.
 * @returns Line checkpoint metadata, or undefined when fragments are unsafe.
 */
export function createQuireTextblockTailLineCheckpoints(
  fragments: readonly QuireTextFragment[],
  contentStart: number
): QuireTextblockTailLineCheckpoints | undefined {
  if (fragments.length === 0) {
    return undefined;
  }

  const fromOffsets: number[] = [];
  const toOffsets: number[] = [];
  const yCoordinates: number[] = [];
  let previousY = -Infinity;
  let previousRight = -Infinity;
  let previousFromOffset = -Infinity;

  for (const fragment of fragments) {
    const fromOffset = fragment.range.from - contentStart;
    const toOffset = fragment.range.to - contentStart;
    if (
      fragment.direction === "rtl" ||
      !Number.isFinite(fragment.rect.y) ||
      fragment.rect.y < previousY ||
      (fragment.rect.y === previousY && fragment.rect.x < previousRight) ||
      !Number.isFinite(fromOffset) ||
      !Number.isFinite(toOffset) ||
      fromOffset < 0 ||
      toOffset < fromOffset ||
      fromOffset <= previousFromOffset
    ) {
      return undefined;
    }

    fromOffsets.push(fromOffset);
    toOffsets.push(toOffset);
    yCoordinates.push(fragment.rect.y);
    previousY = fragment.rect.y;
    previousRight = fragment.rect.x + fragment.rect.width;
    previousFromOffset = fromOffset;
  }

  return { fromOffsets, toOffsets, yCoordinates };
}

/**
 * Finds the previous checkpoint whose line starts at or before an offset.
 *
 * @param offsets - Retained line-start offsets.
 * @param affectedOffset - Text offset where the local edit begins.
 * @returns Checkpoint index for the affected line, or undefined when none exists.
 */
function findCheckpointLineIndexAtOffset(
  offsets: readonly number[],
  affectedOffset: number
): number | undefined {
  let low = 0;
  let high = offsets.length - 1;
  let lineIndex: number | undefined;

  while (low <= high) {
    const index = Math.floor((low + high) / 2);
    const lineStartOffset = offsets[index];
    if (lineStartOffset === undefined) {
      return undefined;
    }

    if (lineStartOffset <= affectedOffset) {
      lineIndex = index;
      low = index + 1;
    } else {
      high = index - 1;
    }
  }

  return lineIndex;
}
