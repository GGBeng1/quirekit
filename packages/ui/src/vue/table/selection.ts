import type { QuireKitCheckboxState } from "../../components/checkbox";

/**
 * Derives the page checkbox without counting disabled or off-page rows.
 * @param enabledKeys - Keys that may be changed on the displayed page.
 * @param selectedKeys - Selection across all visited pages.
 * @returns Checked, unchecked or mixed page state.
 */
export function tablePageChecked(enabledKeys: readonly string[], selectedKeys: readonly string[]): QuireKitCheckboxState {
  const selected = new Set(selectedKeys);
  const count = enabledKeys.filter(key => selected.has(key)).length;
  return count === 0 ? false : count === enabledKeys.length ? true : "indeterminate";
}

/**
 * Updates only the explicitly targeted keys, preserving remote and disabled selections.
 * @param selectedKeys - Current host or uncontrolled selection.
 * @param targetKeys - Enabled keys affected by this interaction.
 * @param checked - Whether to add or remove them.
 * @returns Deduplicated selection with unaffected keys retained.
 */
export function changeTableSelection(selectedKeys: readonly string[], targetKeys: readonly string[], checked: boolean): string[] {
  const selected = new Set(selectedKeys);
  for (const key of targetKeys) {
    if (checked) selected.add(key);
    else selected.delete(key);
  }
  return [...selected];
}
