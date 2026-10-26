import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireCaretGeometry } from "@quirekit/view-engine";
import type { SvgTextMeasurement } from "../types";
import { doVerticalBandsOverlap } from "./rect";

const defaultCaretWidth = 1;
const svgCaretMergeTolerance = 0.5;

/**
 * Builds collapsed caret geometry from SVG text measurements.
 *
 * @param retainedCarets - Existing retained caret geometry to refine.
 * @param measurements - Browser measurements collected from visible SVG text.
 * @returns SVG-measured caret geometry with retained provenance preserved.
 */
export function buildSvgMeasuredCaretGeometry(
  retainedCarets: readonly QuireCaretGeometry[],
  measurements: readonly SvgTextMeasurement[]
): readonly QuireCaretGeometry[] {
  let hasMeasuredCaret = false;
  const carets = retainedCarets.flatMap((caret) => {
    const measuredCarets = collectSvgMeasuredCaretCandidates(caret, measurements);

    if (measuredCarets.length === 0) {
      return [caret];
    }

    hasMeasuredCaret = true;

    return measuredCarets;
  });

  return hasMeasuredCaret ? carets : retainedCarets;
}

/**
 * Collects browser-measured caret candidates for one retained caret.
 *
 * A BiDi boundary can map one logical document position to two distinct visual
 * caret locations, one for each adjacent direction run. SVG's per-text-node
 * measurement APIs expose those locations separately, so keep both and let the
 * overlay represent the ambiguity explicitly.
 *
 * @param retainedCaret - Retained caret geometry that owns the selection identity.
 * @param measurements - Browser measurements collected from visible SVG text.
 * @returns Unique visual caret candidates in measurement order.
 */
function collectSvgMeasuredCaretCandidates(
  retainedCaret: QuireCaretGeometry,
  measurements: readonly SvgTextMeasurement[]
): readonly QuireCaretGeometry[] {
  const carets: QuireCaretGeometry[] = [];
  const position = retainedCaret.position.pos;

  for (const measurement of measurements) {
    const commandRange = measurement.command.range;

    if (
      commandRange === undefined ||
      position < commandRange.from ||
      position > commandRange.to ||
      !doVerticalBandsOverlap(measurement.command.rect, retainedCaret.rect)
    ) {
      continue;
    }

    const x = measurement.resolveXAtOffset(position - commandRange.from);

    if (x === null) {
      continue;
    }

    const caret = {
      position: {
        pos: position,
        bias: resolveSvgMeasuredCaretBias(position, commandRange)
      },
      // Browser text measurement refines advance only. The retained snapshot
      // owns run-relative vertical metrics and any already-applied clipping.
      rect: {
        x,
        y: retainedCaret.rect.y,
        width: defaultCaretWidth,
        height: retainedCaret.rect.height
      },
      ...(retainedCaret.queryOwner === undefined
        ? {}
        : { queryOwner: retainedCaret.queryOwner })
    };

    if (!carets.some((item) => isEquivalentSvgCaret(item, caret))) {
      carets.push(caret);
    }
  }

  return carets;
}

/**
 * Resolves a document bias for one caret candidate within a text command.
 *
 * @param position - Document position represented by the caret.
 * @param commandRange - Document range covered by the measured text command.
 * @returns ProseMirror-compatible position bias.
 */
function resolveSvgMeasuredCaretBias(
  position: number,
  commandRange: QuireDocumentRange
): -1 | 1 {
  return position >= commandRange.to ? -1 : 1;
}

/**
 * Checks whether two browser-measured carets represent the same visual location.
 *
 * @param first - First caret candidate.
 * @param second - Second caret candidate.
 * @returns True when both carets are visually equivalent.
 */
function isEquivalentSvgCaret(
  first: QuireCaretGeometry,
  second: QuireCaretGeometry
): boolean {
  return first.position.pos === second.position.pos &&
    Math.abs(first.rect.x - second.rect.x) <= svgCaretMergeTolerance &&
    Math.abs(first.rect.y - second.rect.y) <= svgCaretMergeTolerance &&
    Math.abs(first.rect.width - second.rect.width) <= svgCaretMergeTolerance &&
    Math.abs(first.rect.height - second.rect.height) <= svgCaretMergeTolerance;
}
