import type {
  ClassicEditorWorkspacePanelContribution,
  ClassicEditorWorkspacePanelEntry,
  ClassicEditorWorkspacePanelFreshness,
  ClassicEditorWorkspacePanelTarget
} from "../../types/workspace-panel";
import {
  freezeWorkspacePanelEntry,
  freezeWorkspacePanelFreshness
} from "./freeze";
import { haveSameWorkspacePanelTarget } from "./validation";

/**
 * Applies one exact monotonic target update to every matching stack occurrence.
 *
 * @param stack - Current single panel stack.
 * @param target - Exact stable target identity.
 * @param freshness - New owner-local freshness facts.
 * @returns Updated stack, or null when no retained occurrence changed.
 */
export function updateWorkspacePanelStackFreshness(
  stack: readonly ClassicEditorWorkspacePanelEntry[],
  target: ClassicEditorWorkspacePanelTarget,
  freshness: ClassicEditorWorkspacePanelFreshness
): readonly ClassicEditorWorkspacePanelEntry[] | null {
  let changed = false;
  const next = stack.map((entry) => {
    if (
      !haveSameWorkspacePanelTarget(entry.target, target)
      || freshness.revision <= entry.freshness.revision
    ) return entry;
    changed = true;
    return freezeWorkspacePanelEntry({
      ...entry,
      freshness: freezeWorkspacePanelFreshness(freshness)
    });
  });
  return changed ? next : null;
}

/**
 * Removes every occurrence owned by one exact contribution object.
 *
 * @param stack - Current single panel stack.
 * @param contribution - Exact removed plugin contribution.
 * @returns Filtered stack, or null when no occurrence used the contribution.
 */
export function removeWorkspacePanelContributionEntries(
  stack: readonly ClassicEditorWorkspacePanelEntry[],
  contribution: ClassicEditorWorkspacePanelContribution
): readonly ClassicEditorWorkspacePanelEntry[] | null {
  const next = stack.filter((entry) => entry.contribution !== contribution);
  return next.length === stack.length ? null : next;
}
