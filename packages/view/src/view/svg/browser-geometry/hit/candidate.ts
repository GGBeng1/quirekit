import type {
  QuireDocumentPosition,
  QuireDocumentPositionBias,
  QuirePoint,
  QuireRect,
  QuireTextPaintCommand
} from "@quirekit/renderer";
import type { QuireHitTestResult } from "@quirekit/view-engine";
import type { SvgTextMeasurement } from "../types";
import { clampSvgBrowserGeometryNumber } from "../math";

const svgBrowserHitBandTolerance = 0.5;

/** Browser-measured SVG text hit-test candidate. */
export interface SvgBrowserTextHitCandidate {
  /** Display command that owns the rendered text element. */
  readonly command: QuireTextPaintCommand;
  /** Document position resolved from the browser character boundary. */
  readonly position: QuireDocumentPosition;
  /** Horizontal distance from the tested point to the chosen caret boundary. */
  readonly distanceX: number;
}

/**
 * Hit-tests one collected SVG text measurement.
 *
 * @param measurement - SVG text measurement to inspect.
 * @param point - Pointer point in the SVG root's user coordinates.
 * @returns Candidate hit, or null when the measurement cannot answer.
 */
export function hitTestSvgTextMeasurement(
  measurement: SvgTextMeasurement,
  point: QuirePoint
): SvgBrowserTextHitCandidate | null {
  const command = measurement.command;

  if (
    !command.range ||
    command.text.length === 0 ||
    !isPointWithinTextBand(command, point)
  ) {
    return null;
  }

  const boundary = measurement.resolveOffsetAtPoint(point);

  if (!boundary) {
    return null;
  }

  const maxOffset = Math.min(command.text.length, command.range.to - command.range.from);
  const offset = clampSvgBrowserGeometryNumber(boundary.offset, 0, maxOffset);

  return {
    command,
    position: {
      pos: command.range.from + offset,
      bias: resolveDocumentPositionBias(offset, maxOffset, boundary.afterCharacter)
    },
    distanceX: boundary.distanceX
  };
}

/**
 * Checks whether a browser text hit is allowed to refine the retained hit.
 *
 * @param candidate - Browser-measured text candidate.
 * @param retainedHit - Shared retained geometry hit used as the authority.
 * @returns Whether the candidate belongs to the same retained range and visual band.
 */
export function isSvgBrowserTextHitCandidateCompatibleWithRetainedHit(
  candidate: SvgBrowserTextHitCandidate,
  retainedHit: QuireHitTestResult
): boolean {
  if (retainedHit.kind !== "position") {
    return true;
  }

  if (candidate.command.range === undefined) {
    return false;
  }

  return (
    candidate.command.range.from <= retainedHit.position.pos &&
    retainedHit.position.pos <= candidate.command.range.to &&
    doSvgBrowserHitRectsOverlapVertically(candidate.command.rect, retainedHit.rect)
  );
}

/**
 * Checks whether a point is vertically inside a text command's line band.
 *
 * @param command - Text command being tested.
 * @param point - SVG user-space point.
 * @returns Whether the point is on the same visual line band.
 */
function isPointWithinTextBand(
  command: QuireTextPaintCommand,
  point: QuirePoint
): boolean {
  return (
    point.y >= command.rect.y &&
    point.y <= command.rect.y + command.rect.height
  );
}

/**
 * Checks whether two hit rectangles share the same visual line band.
 *
 * @param first - First rectangle in document coordinates.
 * @param second - Second rectangle in document coordinates.
 * @returns Whether their vertical bands overlap with measurement tolerance.
 */
function doSvgBrowserHitRectsOverlapVertically(
  first: QuireRect,
  second: QuireRect
): boolean {
  return (
    first.y <= second.y + second.height + svgBrowserHitBandTolerance &&
    second.y <= first.y + first.height + svgBrowserHitBandTolerance
  );
}

/**
 * Resolves a PM bias for a measured text boundary.
 *
 * @param offset - Text offset selected inside the command range.
 * @param maxOffset - Largest selectable offset in the command range.
 * @param afterCharacter - Whether the chosen boundary is the end of a character.
 * @returns Bias to pass to PM selection helpers.
 */
function resolveDocumentPositionBias(
  offset: number,
  maxOffset: number,
  afterCharacter: boolean
): QuireDocumentPositionBias {
  if (offset <= 0) {
    return 1;
  }

  if (offset >= maxOffset) {
    return -1;
  }

  return afterCharacter ? 1 : -1;
}
