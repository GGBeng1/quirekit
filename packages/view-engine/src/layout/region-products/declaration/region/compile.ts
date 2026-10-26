import type {
  QuireLayoutRegion,
  QuireLayoutRegionRef,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type {
  QuireRetainedRegionRegionDeclaration,
  QuireRetainedRegionProductDeclaration,
  QuireRetainedRegionProductGap
} from "../types";
import type { QuireRetainedRegionCompilationContext } from "../shared";
import {
  isBlankQuireRetainedRegionTextFact,
  validateQuireRetainedRegionTextFact
} from "../shared";
import { validateQuireRetainedRegionRegionFacts } from "./facts";
import { resolveQuireRetainedRegionParentRegionAddress } from "./parent";
import { createQuireRetainedRegionRegionKey } from "./key";
import { validateQuireRetainedRegionSemantics } from "../semantics";

/**
 * Validates region declarations when no canonical root can own them yet.
 *
 * @param declaration - Producer declaration being compiled.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @returns Empty retained region list because no valid root exists.
 */
export function validateQuireRetainedRegionRegionsWithoutRoot(
  declaration: QuireRetainedRegionProductDeclaration,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[]
): readonly QuireLayoutRegion[] {
  const regions = declaration.regions ?? [];

  if (regions.length === 0) {
    gaps.push({
      code: "missing-region",
      message: "Retained-region producer must declare at least one retained region.",
      producerId: context.producerId,
      sourceKind: context.sourceKind
    });
    return [];
  }

  const seenRegionKeys = new Set<string>();

  for (const region of regions) {
    validateQuireRetainedRegionRegionFacts(
      region,
      regions,
      seenRegionKeys,
      context,
      gaps,
      true
    );
    validateQuireRetainedRegionSemantics({
      semantics: region.semantics,
      source: region.source,
      regionId: region.regionId,
      context,
      gaps
    });
  }

  return [];
}

/**
 * Compiles retained regions from an producer declaration.
 *
 * @param declaration - Producer declaration being compiled.
 * @param root - Retained root that owns the compiled regions.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @returns Retained regions whose required facts are present.
 */
export function compileQuireRetainedRegionRegions(
  declaration: QuireRetainedRegionProductDeclaration,
  root: QuireLayoutRoot,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[]
): readonly QuireLayoutRegion[] {
  const regions = declaration.regions ?? [];

  if (regions.length === 0) {
    gaps.push({
      code: "missing-region",
      message: "Retained-region producer must declare at least one retained region.",
      producerId: context.producerId,
      sourceKind: context.sourceKind
    });
    return [];
  }

  const compiled: QuireLayoutRegion[] = [];
  const seenRegionKeys = new Set<string>();

  for (const region of regions) {
    const compiledRegion = compileQuireRetainedRegionRegion(
      region,
      root,
      regions,
      seenRegionKeys,
      context,
      gaps
    );

    if (compiledRegion !== undefined) {
      compiled.push(compiledRegion);
    }
  }

  return compiled;
}

/**
 * Compiles one retained region declaration.
 *
 * @param region - Region declaration to compile.
 * @param root - Retained root that owns the region.
 * @param allRegions - All declared regions, used for parent lookup.
 * @param seenRegionKeys - Mutable set used to detect duplicate region identities.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @returns Retained region, or undefined when required facts are missing.
 */
function compileQuireRetainedRegionRegion(
  region: QuireRetainedRegionRegionDeclaration,
  root: QuireLayoutRoot,
  allRegions: readonly QuireRetainedRegionRegionDeclaration[],
  seenRegionKeys: Set<string>,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[]
): QuireLayoutRegion | undefined {
  const regionId = validateQuireRetainedRegionTextFact(
    region.regionId,
    "missing-region-id",
    "Retained region must declare a stable region id.",
    context,
    gaps
  );
  validateQuireRetainedRegionRegionFacts(
    region,
    allRegions,
    seenRegionKeys,
    context,
    gaps,
    false
  );
  const parentRegion = resolveQuireRetainedRegionParentRegionAddress(
    region,
    root,
    allRegions,
    context,
    gaps
  );
  const semanticsValid = validateQuireRetainedRegionSemantics({
    semantics: region.semantics,
    source: region.source,
    regionId,
    context,
    gaps
  });

  if (
    regionId === undefined
    || region.kind === undefined
    || region.source === undefined
    || region.source.sourceId.length === 0
    || region.capabilities === undefined
    || (region.visualInstance?.kind === "repeated"
      && isBlankQuireRetainedRegionTextFact(region.visualInstance.visualInstanceId))
    || parentRegion === null
    || !semanticsValid
  ) {
    return undefined;
  }

  const ref: QuireLayoutRegionRef = {
    rootId: root.id,
    regionId: { value: regionId },
    kind: region.kind,
    ...(region.visualInstance?.visualInstanceId === undefined
      ? {}
      : { visualInstanceId: region.visualInstance.visualInstanceId }),
    ...(parentRegion === undefined ? {} : { parentRegion })
  };
  const regionKey = createQuireRetainedRegionRegionKey(ref);

  if (seenRegionKeys.has(regionKey)) {
    gaps.push({
      code: "duplicate-region",
      message: `Retained region "${regionId}" is duplicated for the same visual instance.`,
      producerId: context.producerId,
      sourceKind: context.sourceKind,
      regionId
    });
    return undefined;
  }

  seenRegionKeys.add(regionKey);

  return {
    ref,
    source: region.source,
    ...(region.rect === undefined ? {} : { rect: region.rect }),
    ...(region.coordinateSpace === undefined ? {} : { coordinateSpace: region.coordinateSpace }),
    capabilities: region.capabilities,
    ...(region.semantics === undefined ? {} : { semantics: region.semantics }),
    ...(region.exportFallbacks === undefined ? {} : { exportFallbacks: region.exportFallbacks }),
    ...(region.diagnosticsMetadata === undefined ? {} : { diagnosticsMetadata: region.diagnosticsMetadata })
  };
}
