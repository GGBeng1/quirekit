import type {
  MountedViewUpdateRevision,
  MountedViewUpdateRevisionClock
} from "./types";

/**
 * Creates the shared monotonic revision authority for one mounted runtime.
 *
 * @returns Revision clock that separates editor-state freshness from layout invalidation.
 */
export function createMountedViewUpdateRevisionClock(): MountedViewUpdateRevisionClock {
  let stateVersion = 0;
  let layoutEpoch = 0;

  return {
    advance(layoutInvalidated) {
      stateVersion += 1;
      if (layoutInvalidated) {
        layoutEpoch += 1;
      }

      return createRevision(stateVersion, layoutEpoch);
    },
    current() {
      return createRevision(stateVersion, layoutEpoch);
    }
  };
}

/**
 * Creates an immutable value snapshot for scheduler comparison.
 *
 * @param stateVersion - Latest mounted editor-state version.
 * @param layoutEpoch - Latest mounted layout-input epoch.
 * @returns Revision value detached from future clock advances.
 */
function createRevision(
  stateVersion: number,
  layoutEpoch: number
): MountedViewUpdateRevision {
  return { stateVersion, layoutEpoch };
}
