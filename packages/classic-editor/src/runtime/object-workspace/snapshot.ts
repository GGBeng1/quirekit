import type {
  ClassicEditorObjectFreshness,
  ClassicEditorObjectWorkspaceContribution,
  ClassicEditorObjectWorkspaceSnapshot
} from "../../types/object-workspace";

/** @returns Frozen initial object workspace snapshot. */
export function createInitialObjectWorkspaceSnapshot(): ClassicEditorObjectWorkspaceSnapshot {
  return Object.freeze({
    revision: 0,
    contribution: null,
    target: null,
    freshness: null,
    sheetOpen: false,
    activeTabId: null
  });
}

/**
 * Freezes one object snapshot while preserving direct contribution identity.
 *
 * @param revision - Monotonic controller revision.
 * @param contribution - Current direct contribution.
 * @param freshness - Latest exact-target freshness.
 * @param sheetOpen - Responsive Sheet state.
 * @param activeTabId - Active Inspector tab.
 * @returns Immutable state snapshot.
 */
export function freezeObjectWorkspaceSnapshot(
  revision: number,
  contribution: ClassicEditorObjectWorkspaceContribution | null,
  freshness: ClassicEditorObjectFreshness | null,
  sheetOpen: boolean,
  activeTabId: string | null
): ClassicEditorObjectWorkspaceSnapshot {
  return Object.freeze({
    revision,
    contribution,
    target: contribution?.target ?? null,
    freshness: freshness === null ? null : Object.freeze({ ...freshness }),
    sheetOpen,
    activeTabId
  });
}
