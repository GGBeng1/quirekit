import type {
  QuireInlineFlowExclusion,
  QuireInlineFlowLine,
  QuireInlineFlowRegionGap
} from "./types";
import { validateQuireInlineFlowDeclaration } from "./validate";

/**
 * Filters invalid line declarations and appends typed gaps.
 *
 * @param lines - Line declarations in visual order.
 * @param gaps - Mutable compiler gap sink.
 * @returns Lines whose identity and geometry are complete.
 */
export function collectValidQuireInlineFlowLines(
  lines: readonly QuireInlineFlowLine[],
  gaps: QuireInlineFlowRegionGap[]
): readonly QuireInlineFlowLine[] {
  const duplicateIds = collectDuplicateIds(lines);
  return lines.filter((line) => {
    const lineGaps = [...validateQuireInlineFlowDeclaration({
      productKind: "line",
      productId: line.id,
      owner: line.owner,
      occurrence: line.occurrence,
      rect: line.rect
    })];
    if (line.scopeId.trim().length === 0) {
      lineGaps.push({
        code: "invalid-identity",
        productKind: "line",
        productId: line.id,
        message: "Inline flow lines require a non-empty flow scope id."
      });
    }
    if (duplicateIds.has(line.id)) {
      lineGaps.push({
        code: "duplicate-line-id",
        productKind: "line",
        productId: line.id,
        message: `Inline flow line id "${line.id}" is duplicated.`
      });
    }
    gaps.push(...lineGaps);
    return lineGaps.length === 0;
  });
}

/**
 * Filters invalid exclusion declarations and appends typed gaps.
 *
 * @param exclusions - Exclusion declarations in producer order.
 * @param scopeSpaces - Coordinate spaces owned by valid line scopes.
 * @param gaps - Mutable compiler gap sink.
 * @returns Exclusions whose identity, geometry, and target scope are complete.
 */
export function collectValidQuireInlineFlowExclusions(
  exclusions: readonly QuireInlineFlowExclusion[],
  scopeSpaces: ReadonlyMap<string, QuireInlineFlowLine["rect"]["space"]>,
  gaps: QuireInlineFlowRegionGap[]
): readonly QuireInlineFlowExclusion[] {
  const duplicateIds = collectDuplicateIds(exclusions);
  return exclusions.filter((exclusion) => {
    const exclusionGaps = [...validateQuireInlineFlowDeclaration({
      productKind: "exclusion",
      productId: exclusion.id,
      owner: exclusion.owner,
      occurrence: exclusion.occurrence,
      rect: exclusion.rect
    })];
    const scopeSpace = scopeSpaces.get(exclusion.targetScopeId);
    if (scopeSpace === undefined) {
      exclusionGaps.push({
        code: "missing-target-flow-scope",
        productKind: "exclusion",
        productId: exclusion.id,
        message: `Target flow scope "${exclusion.targetScopeId}" has no valid lines.`
      });
    } else if (scopeSpace !== exclusion.rect.space) {
      exclusionGaps.push({
        code: "flow-scope-space-mismatch",
        productKind: "exclusion",
        productId: exclusion.id,
        message: `Exclusion space "${exclusion.rect.space}" does not match scope space "${scopeSpace}".`
      });
    }
    if (duplicateIds.has(exclusion.id)) {
      exclusionGaps.push({
        code: "duplicate-exclusion-id",
        productKind: "exclusion",
        productId: exclusion.id,
        message: `Inline flow exclusion id "${exclusion.id}" is duplicated.`
      });
    }
    gaps.push(...exclusionGaps);
    return exclusionGaps.length === 0;
  });
}

/**
 * Finds ids that occur more than once.
 *
 * @param products - Products with stable ids.
 * @returns Duplicate ids.
 */
function collectDuplicateIds(
  products: readonly Readonly<{ id: string }>[]
): ReadonlySet<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const product of products) {
    if (seen.has(product.id)) {
      duplicates.add(product.id);
    }
    seen.add(product.id);
  }
  return duplicates;
}
