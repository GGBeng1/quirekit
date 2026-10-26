import { NodeSelection } from "@quirekit/pm";
import type { QuireEditorState } from "@quirekit/core";
import { isQuireLayerContributionBodyPending } from "../../layout/region-products/layer-contribution/deferred";
import type { QuireRetainedLayerContribution } from "../../layout/region-products/layer-contribution/types";

/**
 * Reports whether one canonical layer contribution should be realized now.
 *
 * Activation is evaluated from the current editor state, exact retained owner
 * range, and any explicitly related nested text range. Provider output remains
 * stable across selection-only updates.
 *
 * @param contribution - Canonical retained contribution to inspect.
 * @param state - Current editor state carrying the authoritative selection.
 * @returns Whether paint, overlay, and interaction consumers may realize it.
 */
export function isQuireRetainedLayerContributionActive(
  contribution: QuireRetainedLayerContribution,
  state: QuireEditorState
): boolean {
  if (contribution.activation === undefined) {
    return true;
  }

  const selection = state.pm.selection;
  const ownsNodeSelection = selection instanceof NodeSelection
    && selection.from === contribution.range.from
    && selection.to === contribution.range.to;
  if (ownsNodeSelection) {
    return true;
  }

  const relatedRange = contribution.activation.relatedRange;
  return relatedRange !== undefined
    && selection.from >= relatedRange.from
    && selection.to <= relatedRange.to;
}

/**
 * Filters canonical layer contributions for the current editor state.
 *
 * @param contributions - Stable provider products from the layout snapshot.
 * @param state - Current editor state carrying runtime activation facts.
 * @returns Contributions active for this render and interaction projection.
 */
export function filterQuireActiveLayerContributions(
  contributions: readonly QuireRetainedLayerContribution[],
  state: QuireEditorState
): readonly QuireRetainedLayerContribution[] {
  return contributions.filter((contribution) =>
    isQuireRetainedLayerContributionActive(contribution, state)
  );
}

/**
 * Collects top-level command ids replaced when runtime activation changes.
 *
 * A deferred body that was never read was never painted, so it contributes no ids and stays
 * unrealized.
 *
 * @param contributions - Stable provider products from the layout snapshot.
 * @param paintSurface - Paint surface whose dynamic commands will be replaced.
 * @returns Top-level display command ids owned by runtime-activated products.
 */
export function collectQuireActivatedLayerCommandIds(
  contributions: readonly QuireRetainedLayerContribution[],
  paintSurface: QuireRetainedLayerContribution["paintSurface"]
): ReadonlySet<string> {
  return new Set(contributions
    .filter((contribution) =>
      contribution.activation !== undefined
      && contribution.paintSurface === paintSurface
      && !isQuireLayerContributionBodyPending(contribution)
    )
    .flatMap((contribution) => contribution.commands)
    .map((command) => command.id)
    .filter((id): id is string => typeof id === "string"));
}
