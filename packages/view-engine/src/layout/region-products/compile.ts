import {
  compileQuireRetainedRegionProducts,
  type QuireRetainedRegionProductDeclaration
} from "./declaration";
import type { QuireRetainedRegionProducts } from "./types";

/**
 * Compiles independent retained-region declarations into one canonical bundle.
 *
 * Invalid declarations contribute diagnostics only. Their partial roots,
 * regions, targets, and policies are deliberately excluded so consumers never
 * route through invented or incomplete ownership.
 *
 * @param declarations - Capability declarations from layout producers.
 * @returns Canonical retained products plus explicit production gaps.
 */
export function compileQuireRetainedRegionProductSet(
  declarations: readonly QuireRetainedRegionProductDeclaration[]
): QuireRetainedRegionProducts {
  const roots = [];
  const regions = [];
  const hitTargets = [];
  const layerContributions = [];
  const selectionPolicies = [];
  const gaps = [];

  for (const declaration of declarations) {
    const compilation = compileQuireRetainedRegionProducts(declaration);

    gaps.push(...compilation.gaps);

    if (!compilation.valid || compilation.root === undefined) {
      continue;
    }

    roots.push(compilation.root);
    regions.push(...compilation.regions);
    hitTargets.push(...compilation.hitTargets);
    layerContributions.push(...compilation.layerContributions);
    selectionPolicies.push(...compilation.selectionPolicies);
  }

  return {
    roots,
    regions,
    hitTargets,
    layerContributions,
    selectionPolicies,
    gaps
  };
}
