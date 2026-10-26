import { normalizeQuireTableLineSegment } from "../geometry";
import type { QuireTableBorderCandidate } from "../../types";

const borderGeometryEpsilon = 0.001;

/** Axis-aligned orientation for a normalized table border line. */
export type QuireTableBorderAxisOrientation = "horizontal" | "vertical";

/** Candidate metadata normalized onto one major axis. */
export interface QuireTableBorderAxisCandidate {
  /** Original border candidate. */
  readonly candidate: QuireTableBorderCandidate;
  /** Normalized physical line. */
  readonly line: QuireTableBorderCandidate["line"];
  /** Physical line orientation. */
  readonly orientation: QuireTableBorderAxisOrientation;
  /** Fixed coordinate perpendicular to the major axis. */
  readonly axis: number;
  /** Inclusive span start along the major axis. */
  readonly start: number;
  /** Inclusive span end along the major axis. */
  readonly end: number;
  /** Original candidate order used for deterministic output. */
  readonly order: number;
}

/**
 * Creates normalized axis metadata for one candidate.
 *
 * @param candidate - Border candidate to normalize.
 * @param order - Original candidate order.
 * @returns Axis metadata for interval partitioning.
 */
export function createQuireTableBorderAxisCandidate(
  candidate: QuireTableBorderCandidate,
  order: number
): QuireTableBorderAxisCandidate {
  const line = normalizeQuireTableLineSegment(candidate.line);
  const deltaX = Math.abs(line.to.x - line.from.x);
  const deltaY = Math.abs(line.to.y - line.from.y);
  const orientation: QuireTableBorderAxisOrientation = deltaX >= deltaY
    ? "horizontal"
    : "vertical";

  if (orientation === "horizontal") {
    return {
      candidate,
      line,
      orientation,
      axis: line.from.y,
      start: Math.min(line.from.x, line.to.x),
      end: Math.max(line.from.x, line.to.x),
      order
    };
  }

  return {
    candidate,
    line,
    orientation,
    axis: line.from.x,
    start: Math.min(line.from.y, line.to.y),
    end: Math.max(line.from.y, line.to.y),
    order
  };
}

/**
 * Creates the collinear group key for a normalized axis candidate.
 *
 * @param candidate - Axis candidate to key.
 * @returns Stable orientation and axis key.
 */
export function createQuireTableBorderAxisCandidateKey(
  candidate: QuireTableBorderAxisCandidate
): string {
  return `${candidate.orientation}:${formatQuireTableBorderCoordinate(candidate.axis)}`;
}

/**
 * Creates a physical line for one atomic axis interval.
 *
 * @param candidate - Candidate carrying orientation and fixed axis.
 * @param start - Interval start along the major axis.
 * @param end - Interval end along the major axis.
 * @returns Axis-aligned line for the interval.
 */
export function createQuireTableBorderAxisIntervalLine(
  candidate: QuireTableBorderAxisCandidate,
  start: number,
  end: number
): QuireTableBorderCandidate["line"] {
  return candidate.orientation === "horizontal"
    ? {
        from: { x: start, y: candidate.axis },
        to: { x: end, y: candidate.axis }
      }
    : {
        from: { x: candidate.axis, y: start },
        to: { x: candidate.axis, y: end }
      };
}

/**
 * Compares geometry coordinates using border partition tolerance.
 *
 * @param left - First coordinate.
 * @param right - Second coordinate.
 * @returns True when the coordinates belong to the same partition boundary.
 */
export function areQuireTableBorderCoordinatesClose(
  left: number,
  right: number
): boolean {
  return Math.abs(left - right) <= borderGeometryEpsilon;
}

/**
 * Returns the tolerance used by interval boundary comparisons.
 *
 * @returns Border geometry epsilon in CSS pixels.
 */
export function getQuireTableBorderGeometryEpsilon(): number {
  return borderGeometryEpsilon;
}

/**
 * Formats a coordinate for stable border ids and map keys.
 *
 * @param coordinate - Coordinate to format.
 * @returns Stable compact coordinate string.
 */
export function formatQuireTableBorderCoordinate(coordinate: number): string {
  return Number.isInteger(coordinate)
    ? coordinate.toString()
    : coordinate.toFixed(3).replace(/\.?0+$/u, "");
}
