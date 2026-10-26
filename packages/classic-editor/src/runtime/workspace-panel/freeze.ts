import type {
  ClassicEditorWorkspacePanelEntry,
  ClassicEditorWorkspacePanelFreshness,
  ClassicEditorWorkspacePanelSnapshot,
  ClassicEditorWorkspacePanelTarget
} from "../../types/workspace-panel";

/**
 * Copies one stable target without retaining caller-owned mutable data.
 *
 * @param target - Feature-owned target candidate.
 * @returns Immutable target safe for the panel stack.
 */
export function freezeWorkspacePanelTarget(
  target: ClassicEditorWorkspacePanelTarget
): ClassicEditorWorkspacePanelTarget {
  return Object.freeze({ ...target });
}

/**
 * Copies one target freshness update.
 *
 * @param freshness - Feature-owned freshness facts.
 * @returns Immutable freshness facts.
 */
export function freezeWorkspacePanelFreshness(
  freshness: ClassicEditorWorkspacePanelFreshness
): ClassicEditorWorkspacePanelFreshness {
  return Object.freeze({ ...freshness });
}

/**
 * Copies one stack entry while preserving opaque contribution and focus identities.
 *
 * @param entry - Candidate stack entry.
 * @returns Immutable panel entry.
 */
export function freezeWorkspacePanelEntry(
  entry: ClassicEditorWorkspacePanelEntry
): ClassicEditorWorkspacePanelEntry {
  return Object.freeze({
    ...entry,
    target: freezeWorkspacePanelTarget(entry.target),
    freshness: freezeWorkspacePanelFreshness(entry.freshness)
  });
}

/**
 * Builds one immutable controller snapshot.
 *
 * @param revision - Monotonic controller revision.
 * @param stack - Current single visible navigation stack.
 * @param closeReason - Last final close reason.
 * @returns Immutable state safe for immediate subscriber replay.
 */
export function freezeWorkspacePanelSnapshot(
  revision: number,
  stack: readonly ClassicEditorWorkspacePanelEntry[],
  closeReason: ClassicEditorWorkspacePanelSnapshot["closeReason"]
): ClassicEditorWorkspacePanelSnapshot {
  const frozenStack = Object.freeze(stack.map(freezeWorkspacePanelEntry));
  return Object.freeze({
    revision,
    stack: frozenStack,
    active: frozenStack.at(-1) ?? null,
    canBack: frozenStack.length > 1,
    closeReason
  });
}
