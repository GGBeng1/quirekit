import { compileQuireRetainedRegionProductSet } from "../region-products";
import { validateQuireLayoutProviderResult } from "./validate";
import type {
  CompileQuireLayoutProviderOutputOptions,
  QuireLayoutProviderGap,
  QuireLayoutProviderRegionDeclaration,
  QuireLayoutProviderValidation
} from "./types";
import type { QuireRetainedRegionProductDeclaration } from "../region-products";

/**
 * Compiles narrow provider output into canonical retained products.
 *
 * @param options - Authoritative context and provider-owned output.
 * @returns Canonical accepted result or explicit compilation/validation gaps.
 */
export function compileQuireLayoutProviderOutput(
  options: CompileQuireLayoutProviderOutputOptions
): QuireLayoutProviderValidation {
  const products = compileQuireRetainedRegionProductSet(
    options.output.declarations.map(toRetainedRegionDeclaration)
  );

  if (products.gaps.length > 0) {
    return {
      valid: false,
      gaps: products.gaps.map((gap): QuireLayoutProviderGap => ({
        code: "retained-region-product-gap",
        message: gap.message,
        providerId: options.context.providerId,
        sourceId: options.context.source.sourceId,
        retainedGapCode: gap.code,
        ...(gap.regionId === undefined ? {} : { regionId: gap.regionId })
      }))
    };
  }

  return validateQuireLayoutProviderResult({
    context: options.context,
    result: {
      providerId: options.output.providerId,
      snapshotVersion: options.output.snapshotVersion,
      source: options.output.source,
      layout: options.output.layout,
      products,
      fragments: options.output.fragments,
      continuation: options.output.continuation
    }
  });
}

/**
 * Converts provider ownership naming into the internal producer declaration.
 *
 * @param declaration - Provider-owned region declaration.
 * @returns Internal retained-region compiler declaration.
 */
function toRetainedRegionDeclaration(
  declaration: QuireLayoutProviderRegionDeclaration
): QuireRetainedRegionProductDeclaration {
  const { providerId, ...products } = declaration;
  return {
    ...products,
    ...(providerId === undefined ? {} : { producerId: providerId })
  };
}
