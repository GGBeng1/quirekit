import { subtractQuireInlineFlowExclusions } from "./geometry";
import {
  collectValidQuireInlineFlowExclusions,
  collectValidQuireInlineFlowLines
} from "./declarations";
import {
  collectQuireInlineFlowScopes,
  groupQuireInlineFlowExclusionsByScope
} from "./scope";
import type {
  QuireInlineFlowExclusion,
  QuireInlineFlowLine,
  QuireInlineFlowRegion,
  QuireInlineFlowRegionCompileInput,
  QuireInlineFlowRegionCompileResult,
  QuireInlineFlowRegionGap
} from "./types";

/**
 * Compiles measured lines and exclusions into ordered available inline regions.
 *
 * Invalid declarations only produce typed gaps. They never contribute partial
 * geometry or guessed identity to otherwise valid regions.
 *
 * @param input - Measured lines and exclusion declarations.
 * @returns Valid available regions and typed production gaps.
 */
export function compileQuireInlineFlowRegions(
  input: QuireInlineFlowRegionCompileInput
): QuireInlineFlowRegionCompileResult {
  const gaps: QuireInlineFlowRegionGap[] = [];
  const declaredLines = collectValidQuireInlineFlowLines(input.lines, gaps);
  const scopes = collectQuireInlineFlowScopes(declaredLines, gaps);
  const exclusions = collectValidQuireInlineFlowExclusions(
    input.exclusions,
    scopes.spaces,
    gaps
  );
  const exclusionsByScope = groupQuireInlineFlowExclusionsByScope(exclusions);
  const regions = scopes.lines.flatMap((line) => compileLineRegions(
    line,
    exclusionsByScope.get(line.scopeId) ?? []
  ));
  return { regions, gaps };
}

/**
 * Compiles one valid line into zero or more available inline regions.
 *
 * @param line - Valid measured line.
 * @param exclusions - Valid exclusions targeting the same scope.
 * @returns Available regions in inline order.
 */
function compileLineRegions(
  line: QuireInlineFlowLine,
  exclusions: readonly QuireInlineFlowExclusion[]
): readonly QuireInlineFlowRegion[] {
  const subtraction = subtractQuireInlineFlowExclusions(line, exclusions);
  return subtraction.intervals.map((interval, order) => ({
    id: `${line.id}:region:${order}`,
    lineId: line.id,
    scopeId: line.scopeId,
    owner: line.owner,
    occurrence: line.occurrence,
    rect: {
      space: line.rect.space,
      x: interval.from,
      y: line.rect.y,
      width: interval.to - interval.from,
      height: line.rect.height
    },
    order,
    appliedExclusionIds: subtraction.appliedExclusionIds,
    dependencyIds: subtraction.dependencyIds
  }));
}
