import {
  isQuireLayerContributionBodyPending,
  type QuireRetainedLayerContribution
} from "@quirekit/view-engine";

/**
 * Finds the exact retained contribution that compiled one event target.
 *
 * Unread deferred bodies are skipped: their targets were never exposed, so no event can come
 * from them, and reading them would realize every unselected drawing's chrome.
 *
 * @param contributions - Current retained layer contributions.
 * @param targetId - Compiled renderer target id.
 * @returns Owning contribution, or undefined for stale actions.
 */
export function findMountedDrawingTargetContribution(
  contributions: readonly QuireRetainedLayerContribution[] | undefined,
  targetId: string
): QuireRetainedLayerContribution | undefined {
  return contributions?.find((contribution) =>
    !isQuireLayerContributionBodyPending(contribution)
    && contribution.targets.some((target) => target.id === targetId)
  );
}
