import type { QuireSelectionGeometryContext } from "../../types";
import { selectQuireSubLayoutPositionAffinityCandidate } from "../position-affinity";
import type { QuireSubLayoutCaretStop } from "../types";

/**
 * Selects a caret stop for a collapsed position, using retained visual-instance
 * context before falling back to DOM-like side affinity.
 *
 * @param stops - Matching caret stops for the collapsed position.
 * @param side - Side preference used when wrapped fragments share one position.
 * @param selectionContext - Optional active selection context for repeated visual instances.
 * @returns Preferred caret stop, or null when no stop is available.
 */
export function selectQuireSubLayoutCaretStop(
  stops: readonly QuireSubLayoutCaretStop[],
  side: number,
  selectionContext?: QuireSelectionGeometryContext | undefined
): QuireSubLayoutCaretStop | null {
  const contextStop = selectQuireSubLayoutCaretStopByContext(
    stops,
    selectionContext
  );

  return contextStop ??
    selectQuireSubLayoutPositionAffinityCandidate(stops, side);
}

/**
 * Selects a caret stop that matches retained query ownership or the active
 * gesture rectangle.
 *
 * @param stops - Matching caret stops for the collapsed position.
 * @param selectionContext - Optional active selection context.
 * @returns Context-matched caret stop, or null when context is absent or ambiguous.
 */
function selectQuireSubLayoutCaretStopByContext(
  stops: readonly QuireSubLayoutCaretStop[],
  selectionContext?: QuireSelectionGeometryContext | undefined
): QuireSubLayoutCaretStop | null {
  if (selectionContext === undefined || stops.length === 0) {
    return null;
  }

  const sourceFragmentId = selectionContext.queryOwner?.sourceFragmentId;

  if (sourceFragmentId !== undefined) {
    const stop = stops.find(
      (candidate) => candidate.queryOwner?.sourceFragmentId === sourceFragmentId
    );

    if (stop !== undefined) {
      return stop;
    }

    return null;
  }

  const visualInstanceId = selectionContext.queryOwner?.region?.visualInstanceId ??
    selectionContext.viewRegion?.visualInstanceId;

  if (visualInstanceId !== undefined) {
    const stop = stops.find(
      (candidate) =>
        candidate.queryOwner?.region?.visualInstanceId === visualInstanceId
    );

    if (stop !== undefined) {
      return stop;
    }

    return null;
  }

  return selectionContext.referenceRect === undefined
    ? null
    : findNearestQuireSubLayoutCaretStopToRect(
        stops,
        selectionContext.referenceRect
      );
}

/**
 * Finds the caret stop closest to a document-space reference rectangle.
 *
 * @param stops - Candidate caret stops for the collapsed position.
 * @param referenceRect - Reference rectangle from the active pointer hit.
 * @returns Nearest caret stop, or null when there are no candidates.
 */
function findNearestQuireSubLayoutCaretStopToRect(
  stops: readonly QuireSubLayoutCaretStop[],
  referenceRect: QuireSelectionGeometryContext["referenceRect"]
): QuireSubLayoutCaretStop | null {
  if (referenceRect === undefined || stops.length === 0) {
    return null;
  }

  let nearest: QuireSubLayoutCaretStop | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const stop of stops) {
    const distance = measureQuireSubLayoutCaretStopRectDistance(
      stop,
      referenceRect
    );

    if (distance < nearestDistance) {
      nearest = stop;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/**
 * Measures squared center distance between a caret stop and a reference rect.
 *
 * @param stop - Candidate caret stop to score.
 * @param referenceRect - Reference rectangle from the active pointer hit.
 * @returns Squared distance between rectangle centers.
 */
function measureQuireSubLayoutCaretStopRectDistance(
  stop: QuireSubLayoutCaretStop,
  referenceRect: NonNullable<QuireSelectionGeometryContext["referenceRect"]>
): number {
  const stopCenterX = stop.rect.x + stop.rect.width / 2;
  const stopCenterY = stop.rect.y + stop.rect.height / 2;
  const referenceCenterX = referenceRect.x + referenceRect.width / 2;
  const referenceCenterY = referenceRect.y + referenceRect.height / 2;
  const dx = stopCenterX - referenceCenterX;
  const dy = stopCenterY - referenceCenterY;

  return dx * dx + dy * dy;
}
