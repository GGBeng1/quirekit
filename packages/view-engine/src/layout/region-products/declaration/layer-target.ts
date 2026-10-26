import type { QuireHitTarget } from "../../engine/types";
import {
  normalizeQuireViewInteractionHitLayerFacts,
  resolveQuireViewLayerTargetFacts
} from "../../../view-graph";
import type {
  QuireLayoutRegion
} from "@quirekit/layout/identity";
import type {
  QuireRetainedRegionLayerTargetDeclaration,
  QuireRetainedRegionProductDeclaration,
  QuireRetainedRegionProductGap
} from "./types";
import type { QuireRetainedRegionCompilationContext } from "./shared";
import { validateQuireRetainedRegionTextFact } from "./shared";

/**
 * Compiles retained hit targets from producer layer-target declarations.
 *
 * @param declaration - Producer declaration being compiled.
 * @param regionById - Retained regions keyed by region id.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @returns Retained hit targets whose required facts are present.
 */
export function compileQuireRetainedRegionLayerTargets(
  declaration: QuireRetainedRegionProductDeclaration,
  regionById: ReadonlyMap<string, QuireLayoutRegion>,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[]
): readonly QuireHitTarget[] {
  return (declaration.layerTargets ?? []).flatMap((target) =>
    compileQuireRetainedRegionLayerTarget(target, regionById, context, gaps)
  );
}

/**
 * Compiles one retained hit target.
 *
 * @param target - Layer-target declaration to compile.
 * @param regionById - Retained regions keyed by region id.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @returns Retained hit target array, empty when required facts are missing.
 */
function compileQuireRetainedRegionLayerTarget(
  target: QuireRetainedRegionLayerTargetDeclaration,
  regionById: ReadonlyMap<string, QuireLayoutRegion>,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[]
): readonly QuireHitTarget[] {
  const targetId = validateQuireRetainedRegionTextFact(
    target.targetId,
    "missing-target-id",
    "Retained-region layer target must declare a stable target id.",
    context,
    gaps
  );
  const region = target.regionId === undefined
    ? undefined
    : regionById.get(target.regionId);

  if (target.regionId === undefined || region === undefined) {
    gaps.push({
      code: "missing-target-region",
      message: "Retained-region layer target must reference a compiled retained region.",
      producerId: context.producerId,
      sourceKind: context.sourceKind,
      targetId
    });
  }

  if (target.range === undefined) {
    gaps.push({
      code: "missing-target-range",
      message: "Retained-region layer target must declare a document range.",
      producerId: context.producerId,
      sourceKind: context.sourceKind,
      targetId
    });
  }

  if (target.rect === undefined) {
    gaps.push({
      code: "missing-target-rect",
      message: "Retained-region layer target must declare a document-space rectangle.",
      producerId: context.producerId,
      sourceKind: context.sourceKind,
      targetId
    });
  }

  if (
    targetId === undefined
    || region === undefined
    || target.range === undefined
    || target.rect === undefined
  ) {
    return [];
  }

  const facts = resolveQuireViewLayerTargetFacts({
    layer: target.layer,
    pointerPolicy: target.pointerPolicy,
    interactionHit: target.interactionHit
  });
  const interactionHit = target.interactionHit === undefined
    ? undefined
    : normalizeQuireViewInteractionHitLayerFacts(target.interactionHit, facts);

  return [
    {
      id: `${context.producerId ?? "retained-region"}:${targetId}`,
      range: target.range,
      rect: target.rect,
      ...(target.hitArea === undefined ? {} : { hitArea: target.hitArea }),
      ...(target.interactionScope === undefined
        ? {}
        : { interactionScope: target.interactionScope }),
      viewRegion: region.ref,
      ...(region.source === undefined ? {} : { source: region.source }),
      capabilities: region.capabilities,
      layer: facts.layer,
      pointerPolicy: facts.pointerPolicy,
      ...(interactionHit === undefined ? {} : { interactionHit })
    }
  ];
}
