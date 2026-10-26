import type {
  QuireInlineFlowExclusion,
  QuireInlineFlowLine,
  QuireInlineFlowRegionGap
} from "./types";

/** Valid lines and coordinate-space authority for their flow scopes. */
export interface QuireInlineFlowScopeCollection {
  /** Lines whose scope coordinate space is unambiguous. */
  readonly lines: readonly QuireInlineFlowLine[];
  /** One authoritative coordinate space per flow scope. */
  readonly spaces: ReadonlyMap<string, QuireInlineFlowLine["rect"]["space"]>;
}

/**
 * Establishes one coordinate space for each concrete text-flow scope.
 *
 * @param lines - Lines with otherwise valid declarations.
 * @param gaps - Mutable compiler gap sink.
 * @returns Lines and spaces that can safely participate in subtraction.
 */
export function collectQuireInlineFlowScopes(
  lines: readonly QuireInlineFlowLine[],
  gaps: QuireInlineFlowRegionGap[]
): QuireInlineFlowScopeCollection {
  const spaces = new Map<string, QuireInlineFlowLine["rect"]["space"]>();
  const validLines: QuireInlineFlowLine[] = [];
  for (const line of lines) {
    const current = spaces.get(line.scopeId);
    if (current !== undefined && current !== line.rect.space) {
      gaps.push({
        code: "flow-scope-space-mismatch",
        productKind: "line",
        productId: line.id,
        message: `Line space "${line.rect.space}" does not match scope space "${current}".`
      });
      continue;
    }
    spaces.set(line.scopeId, line.rect.space);
    validLines.push(line);
  }
  return { lines: validLines, spaces };
}

/**
 * Groups valid exclusions by target flow scope.
 *
 * @param exclusions - Valid exclusion declarations.
 * @returns Exclusions in stable declaration order per scope.
 */
export function groupQuireInlineFlowExclusionsByScope(
  exclusions: readonly QuireInlineFlowExclusion[]
): ReadonlyMap<string, readonly QuireInlineFlowExclusion[]> {
  const groups = new Map<string, QuireInlineFlowExclusion[]>();
  for (const exclusion of exclusions) {
    const group = groups.get(exclusion.targetScopeId) ?? [];
    group.push(exclusion);
    groups.set(exclusion.targetScopeId, group);
  }
  return groups;
}
