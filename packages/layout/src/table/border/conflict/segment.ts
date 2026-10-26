import { createQuireTableLineRect, normalizeQuireTableLineSegment } from "../geometry";
import {
  resolveQuireTableBorderColor,
  resolveQuireTableBorderWidth
} from "../style";
import type {
  QuireResolvedTableBorderSegment,
  QuireTableBorderCandidate
} from "../../types";
import type { QuireConcreteTableBorderCandidate } from "./winner";

const tableBorderHitWidth = 6;

/**
 * Assembles a resolved paint and hit segment from one conflict winner.
 *
 * @param winner - Concrete winner selected by border-conflict rules.
 * @param candidates - All candidates contributing ownership to the edge.
 * @returns Resolved visible border segment.
 */
export function createQuireResolvedTableBorderSegment(
  winner: QuireConcreteTableBorderCandidate,
  candidates: readonly QuireTableBorderCandidate[]
): QuireResolvedTableBorderSegment {
  const lineWidth = resolveQuireTableBorderWidth(winner.border);
  const line = normalizeQuireTableLineSegment(winner.line);
  const owners = Array.from(new Set(candidates.map((candidate) => candidate.ownerId)));

  return {
    id: winner.id,
    edge: winner.edge,
    border: winner.border,
    line,
    paintRect: createQuireTableLineRect(line, lineWidth),
    hitRect: createQuireTableLineRect(
      line,
      Math.max(lineWidth, tableBorderHitWidth)
    ),
    owners,
    strokeStyle: resolveQuireTableBorderColor(winner.border),
    lineWidth
  };
}
