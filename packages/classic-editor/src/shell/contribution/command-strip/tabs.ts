import type {
  ClassicEditorCommandTargetKind,
  ClassicEditorRibbonTabContribution
} from "../../../types";
import type { ResolvedClassicEditorCommandStripGroup } from "./types";

/**
 * Keeps ordinary tabs and only target-matching contextual tabs that own actions.
 *
 * @param tabs - Capability-filtered task declarations.
 * @param groups - Direct-action groups surviving producer migration.
 * @param targetKind - Structured current target from the UI semantic snapshot.
 * @returns Visible task tabs in contribution order.
 */
export function resolveClassicEditorCommandTabs(
  tabs: readonly ClassicEditorRibbonTabContribution[],
  groups: readonly ResolvedClassicEditorCommandStripGroup[],
  targetKind: ClassicEditorCommandTargetKind | null
): readonly ClassicEditorRibbonTabContribution[] {
  const tabIds = new Set(groups.map((group) => group.tabId));
  return tabs.filter((tab) => {
    if (!tabIds.has(tab.id)) return false;
    return tab.contextualFor === undefined
      || (targetKind !== null && tab.contextualFor.includes(targetKind));
  });
}

/**
 * Reconciles active task state without auto-switching when contextual tabs appear.
 *
 * @param tabs - Currently visible task tabs.
 * @param activeTab - Previously active tab id.
 * @param ordinaryFallback - Last explicit ordinary task id.
 * @returns Valid active tab id or undefined when no command task is installed.
 */
export function resolveClassicEditorActiveCommandTab(
  tabs: readonly ClassicEditorRibbonTabContribution[],
  activeTab: string | undefined,
  ordinaryFallback: string | undefined
): string | undefined {
  if (tabs.some((tab) => tab.id === activeTab)) return activeTab;
  if (tabs.some((tab) => tab.id === ordinaryFallback)) return ordinaryFallback;
  return tabs.find((tab) => tab.contextualFor === undefined)?.id ?? tabs[0]?.id;
}
