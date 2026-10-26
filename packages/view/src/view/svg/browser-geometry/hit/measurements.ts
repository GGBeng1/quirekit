import {
  withQuireInteractionDiagnostics
} from "@quirekit/view-engine";
import type { QuireHitTestResult } from "@quirekit/view-engine";
import type {
  SvgGeometryProviderHitTestOptions,
  SvgTextMeasurement
} from "../types";
import { mapClientPointToSvgRootPoint } from "./coordinate";
import {
  hitTestSvgTextMeasurement,
  isSvgBrowserTextHitCandidateCompatibleWithRetainedHit
} from "./candidate";
import type { SvgBrowserTextHitCandidate } from "./candidate";

/**
 * Hit-tests rendered SVG text using collected browser measurements.
 *
 * @param measurements - Collected rendered SVG text measurements.
 * @param options - Pointer coordinates and coordinate projection inputs.
 * @returns Browser-measured text hit, or the shared retained hit.
 */
export function hitTestSvgBrowserMeasurements(
  measurements: readonly SvgTextMeasurement[],
  options: SvgGeometryProviderHitTestOptions
): QuireHitTestResult {
  const retainedHit = options.retainedHitTestResult;
  let bestCandidate: SvgBrowserTextHitCandidate | null = null;

  for (const measurement of measurements) {
    const rootPoint = mapClientPointToSvgRootPoint(
      measurement.root,
      options,
      options.retainedDocumentPoint
    );
    const candidate = rootPoint === null
      ? null
      : hitTestSvgTextMeasurement(measurement, rootPoint);

    if (
      candidate &&
      isSvgBrowserTextHitCandidateCompatibleWithRetainedHit(candidate, retainedHit) &&
      (!bestCandidate || candidate.distanceX < bestCandidate.distanceX)
    ) {
      bestCandidate = candidate;
    }
  }

  if (!bestCandidate?.command.range) {
    return retainedHit;
  }

  const browserHit: QuireHitTestResult = {
    kind: "position",
    position: bestCandidate.position,
    inside: retainedHit.kind === "position"
      ? retainedHit.inside
      : bestCandidate.command.range.from,
    rect: bestCandidate.command.rect,
    ...(retainedHit.kind === "position" && retainedHit.viewRegion === undefined
      ? {}
      : retainedHit.kind === "position"
        ? { viewRegion: retainedHit.viewRegion }
        : {}),
    ...(retainedHit.kind === "position" && retainedHit.queryOwner === undefined
      ? {}
      : retainedHit.kind === "position"
        ? { queryOwner: retainedHit.queryOwner }
        : {}),
    ...(retainedHit.kind === "position" && retainedHit.ownerSource === undefined
      ? {}
      : retainedHit.kind === "position"
        ? { ownerSource: retainedHit.ownerSource }
        : {}),
    ...(retainedHit.kind === "position" && retainedHit.ownerCapabilities === undefined
      ? {}
      : retainedHit.kind === "position"
        ? { ownerCapabilities: retainedHit.ownerCapabilities }
        : {}),
    ...(retainedHit.kind === "position" && retainedHit.interactionHit === undefined
      ? {}
      : retainedHit.kind === "position"
        ? { interactionHit: retainedHit.interactionHit }
        : {}),
    ...(retainedHit.kind === "position" && retainedHit.layer === undefined
      ? {}
      : retainedHit.kind === "position"
        ? { layer: retainedHit.layer }
        : {}),
    ...(retainedHit.kind === "position" && retainedHit.pointerPolicy === undefined
      ? {}
      : retainedHit.kind === "position"
        ? { pointerPolicy: retainedHit.pointerPolicy }
        : {}),
    ...(retainedHit.kind === "position" && retainedHit.selectionPolicy === undefined
      ? {}
      : retainedHit.kind === "position"
        ? { selectionPolicy: retainedHit.selectionPolicy }
        : {}),
    ...(retainedHit.kind === "position" && retainedHit.layerHitChain === undefined
      ? {}
      : retainedHit.kind === "position"
        ? { layerHitChain: retainedHit.layerHitChain }
        : {}),
    ...(retainedHit.kind === "position" && retainedHit.layerTargetIndexQuery === undefined
      ? {}
      : retainedHit.kind === "position"
        ? { layerTargetIndexQuery: retainedHit.layerTargetIndexQuery }
        : {}),
    ...(retainedHit.kind === "position" && retainedHit.targetChain === undefined
      ? {}
      : retainedHit.kind === "position"
        ? { targetChain: retainedHit.targetChain }
        : {}),
    ...(retainedHit.kind === "position" && retainedHit.tableRowOffsetSlot === undefined
      ? {}
      : retainedHit.kind === "position"
        ? { tableRowOffsetSlot: retainedHit.tableRowOffsetSlot }
        : {}),
    ...(retainedHit.kind === "position" && retainedHit.tableCell === undefined
      ? {}
      : retainedHit.kind === "position"
        ? { tableCell: retainedHit.tableCell }
        : {})
  };

  return withQuireInteractionDiagnostics(browserHit, retainedHit.diagnostics);
}
