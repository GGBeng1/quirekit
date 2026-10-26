import { resolveViewCoordinateAuthority } from "@quirekit/view-engine";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireInteractionRectAtPositionResult } from "@quirekit/view-engine";
import type { QuireViewCoordsAtPosResult } from "../../shared";
import type {
  SvgGeometryProviderCoordsAtPosOptions,
  SvgTextMeasurement
} from "./types";

const defaultCaretWidth = 1;
const svgCoordsAtPosRectTolerance = 0.5;

/** Boundary role for one measured coords-at-pos candidate. */
type SvgCoordsAtPosBoundary = "start" | "end" | "inside";

/** Browser-measured candidate for one coordsAtPos lookup. */
interface SvgCoordsAtPosCandidate {
  /** Text measurement that produced this candidate. */
  readonly measurement: SvgTextMeasurement;
  /** Candidate caret rectangle in document coordinates. */
  readonly rect: QuireRect;
  /** Whether the requested position sits at the command start, end, or inside it. */
  readonly boundary: SvgCoordsAtPosBoundary;
}

/**
 * Maps a document position to client coordinates using collected SVG measurements.
 *
 * @param measurements - Collected rendered SVG text measurements.
 * @param options - Position, side, and surface projection.
 * @returns Browser-measured client rect scoped by retained identity.
 */
export function resolveSvgBrowserMeasurementsCoordsAtPos(
  measurements: readonly SvgTextMeasurement[],
  options: SvgGeometryProviderCoordsAtPosOptions
): QuireViewCoordsAtPosResult {
  const candidates = collectSvgCoordsAtPosCandidates(measurements, options.pos);
  const scopedCandidates = scopeSvgCoordsAtPosCandidates(
    candidates,
    options.retainedRectAtPosition
  );
  const candidate = selectSvgCoordsAtPosCandidate(
    scopedCandidates,
    options.side ?? 1
  );
  const retainedRect = options.retainedRectAtPosition.rect;
  const refinedRect = candidate === null
    ? retainedRect
    : options.retainedRectAtPosition.source === "viewport-fallback"
      ? candidate.rect
      : {
        x: candidate.rect.x,
        y: retainedRect.y,
        width: candidate.rect.width,
        height: retainedRect.height
      };

  return resolveViewCoordinateAuthority(
    options.surfaceClientRect,
    options.surfaceBounds
  ).clientRectFromDocument(refinedRect);
}

/**
 * Collects browser-measured coordsAtPos candidates for a document position.
 *
 * @param measurements - Collected rendered SVG text measurements.
 * @param position - Document position to resolve.
 * @returns Candidate caret rectangles in measurement order.
 */
function collectSvgCoordsAtPosCandidates(
  measurements: readonly SvgTextMeasurement[],
  position: number
): readonly SvgCoordsAtPosCandidate[] {
  const candidates: SvgCoordsAtPosCandidate[] = [];

  for (const measurement of measurements) {
    const commandRange = measurement.command.range;

    if (
      commandRange === undefined ||
      position < commandRange.from ||
      position > commandRange.to
    ) {
      continue;
    }

    const x = measurement.resolveXAtOffset(position - commandRange.from);

    if (x === null) {
      continue;
    }

    candidates.push({
      measurement,
      boundary: resolveSvgCoordsAtPosBoundary(position, measurement),
      rect: {
        x,
        y: measurement.command.rect.y,
        width: defaultCaretWidth,
        height: measurement.command.rect.height
      }
    });
  }

  return candidates;
}

/**
 * Chooses the measured candidate matching the requested document side.
 *
 * @param candidates - Candidate caret rectangles in measurement order.
 * @param side - Side preference from the DOM-like coordsAtPos API.
 * @returns Preferred candidate, or null when there are none.
 */
function selectSvgCoordsAtPosCandidate(
  candidates: readonly SvgCoordsAtPosCandidate[],
  side: number
): SvgCoordsAtPosCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0] ?? null;
  }

  const preferredBoundary: SvgCoordsAtPosBoundary = side < 0 ? "end" : "start";
  const preferred = candidates.find(
    (candidate) => candidate.boundary === preferredBoundary
  );

  if (preferred) {
    return preferred;
  }

  return side < 0 ? candidates[0] ?? null : candidates.at(-1) ?? null;
}

/**
 * Scopes browser-measured candidates to the retained visual band selected by shared geometry.
 *
 * @param candidates - Browser-measured candidates for the requested document position.
 * @param retained - Shared interaction answer that owns visual identity for the query.
 * @returns Candidates in the same visual band, or every candidate for viewport-only answers.
 */
function scopeSvgCoordsAtPosCandidates(
  candidates: readonly SvgCoordsAtPosCandidate[],
  retained: QuireInteractionRectAtPositionResult
): readonly SvgCoordsAtPosCandidate[] {
  if (retained.source === "viewport-fallback") {
    return candidates;
  }

  const verticalCandidates = candidates.filter((candidate) =>
    doVerticalBandsOverlap(candidate.rect, retained.rect)
  );
  const retainedX = retained.rect.x;
  const horizontallyOwnedCandidates = verticalCandidates.filter((candidate) => {
    const commandRect = candidate.measurement.command.rect;
    return (
      retainedX >= commandRect.x - svgCoordsAtPosRectTolerance
      && retainedX <= commandRect.x + commandRect.width + svgCoordsAtPosRectTolerance
    );
  });

  // Browser metrics may move a caret within its retained paint command, but a
  // different collapsed command (for example a generated list marker) cannot
  // replace the text fragment already selected by shared geometry. Preserve
  // the vertical-only fallback for legacy commands whose retained rect cannot
  // be matched horizontally.
  return horizontallyOwnedCandidates.length > 0
    ? horizontallyOwnedCandidates
    : verticalCandidates;
}

/**
 * Checks whether two rectangles belong to the same visual line band.
 *
 * @param first - First rectangle to compare.
 * @param second - Second rectangle to compare.
 * @returns Whether their vertical bands overlap within SVG measurement tolerance.
 */
function doVerticalBandsOverlap(first: QuireRect, second: QuireRect): boolean {
  return (
    first.y <= second.y + second.height + svgCoordsAtPosRectTolerance &&
    second.y <= first.y + first.height + svgCoordsAtPosRectTolerance
  );
}

/**
 * Resolves how one text command covers the requested document position.
 *
 * @param position - Document position to classify.
 * @param measurement - Measurement whose command range contains the position.
 * @returns Boundary role within the measured command.
 */
function resolveSvgCoordsAtPosBoundary(
  position: number,
  measurement: SvgTextMeasurement
): SvgCoordsAtPosBoundary {
  const commandRange = measurement.command.range;

  if (commandRange === undefined || position <= commandRange.from) {
    return "start";
  }

  return position >= commandRange.to ? "end" : "inside";
}
