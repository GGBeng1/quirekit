import type {
  QuireRetainedRegionProductDeclaration,
  QuireRetainedRegionProductCompilation,
  QuireRetainedRegionProductGap
} from "./types";
import {
  createQuireRetainedRegionCompilationContext,
  validateQuireRetainedRegionTextFact
} from "./shared";
import { compileQuireRetainedRegionRoot } from "./root";
import {
  compileQuireRetainedRegionRegions,
  validateQuireRetainedRegionRegionsWithoutRoot
} from "./region";
import { compileQuireRetainedRegionLayerTargets } from "./layer-target";
import { compileQuireRetainedRegionSelectionPolicies } from "./selection-policy";
import { compileQuireRetainedLayerContributions } from "../layer-contribution";

/**
 * Compiles an internal retained-region declaration into retained view products.
 *
 * This is intentionally not a public plugin API. It is the bottom-level producer
 * seam that future extension hooks can compile to after there are enough real
 * consumers to freeze the higher-level shape.
 *
 * @param declaration - Retained-region producer declaration to compile.
 * @returns Canonical products plus explicit production gaps.
 */
export function compileQuireRetainedRegionProducts(
  declaration: QuireRetainedRegionProductDeclaration
): QuireRetainedRegionProductCompilation {
  const gaps: QuireRetainedRegionProductGap[] = [];
  const context = createQuireRetainedRegionCompilationContext(declaration);
  const producerId = validateQuireRetainedRegionTextFact(
    declaration.producerId,
    "missing-producer-id",
    "Retained-region producer must declare a stable producer id.",
    context,
    gaps
  );
  const sourceKind = validateQuireRetainedRegionTextFact(
    declaration.sourceKind,
    "missing-source-kind",
    "Retained-region producer must declare the node type name it handles.",
    context,
    gaps
  );
  const source = declaration.source;

  if (source === undefined || source.sourceId.length === 0) {
    gaps.push({
      code: "missing-source",
      message: "Retained-region producer must declare source identity.",
      producerId,
      sourceKind
    });
  }

  const resolvedContext = { producerId, sourceKind };
  const root = compileQuireRetainedRegionRoot(declaration, resolvedContext, gaps);
  const regions = root === undefined
    ? validateQuireRetainedRegionRegionsWithoutRoot(
      declaration,
      resolvedContext,
      gaps
    )
    : compileQuireRetainedRegionRegions(declaration, root, resolvedContext, gaps);
  const regionById = new Map(regions.map((region) => [
    region.ref.regionId.value,
    region
  ]));
  const hitTargets = compileQuireRetainedRegionLayerTargets(
    declaration,
    regionById,
    resolvedContext,
    gaps
  );
  const layerContributions = compileQuireRetainedLayerContributions(
    declaration.layerContributions ?? [],
    root,
    regions,
    resolvedContext,
    gaps
  );
  const selectionPolicies = compileQuireRetainedRegionSelectionPolicies(
    declaration,
    regionById,
    resolvedContext,
    gaps
  );

  return {
    valid: gaps.length === 0,
    ...(producerId === undefined ? {} : { producerId }),
    ...(sourceKind === undefined ? {} : { sourceKind }),
    ...(root === undefined ? {} : { root }),
    regions,
    hitTargets,
    layerContributions,
    selectionPolicies,
    gaps
  };
}
