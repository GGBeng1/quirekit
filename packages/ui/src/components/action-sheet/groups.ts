import type { QuireKitActionSheetAction, QuireKitActionSheetGroup } from "./types";

/**
 * Groups adjacent actions without changing action order or silently dropping identity conflicts.
 * @param actions - Host-owned actions with unique values.
 * @returns Consecutive groups suitable for accessible heading sections.
 */
export function groupActionSheetActions(actions: readonly QuireKitActionSheetAction[]): readonly QuireKitActionSheetGroup[] {
  const groups: { label: string | undefined; actions: QuireKitActionSheetAction[] }[] = [];
  const values = new Set<string>();
  for (const action of actions) {
    if (values.has(action.value)) throw new Error(`QuireActionSheet requires unique action values: ${action.value}`);
    values.add(action.value);
    const label = action.group?.trim() || undefined;
    const previous = groups.at(-1);
    if (previous && previous.label === label) previous.actions.push(action);
    else groups.push({ label, actions: [action] });
  }
  return groups;
}
