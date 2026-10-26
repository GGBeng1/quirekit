import type { QuireKitCheckboxGroupItem } from "../../components/checkbox-group";
/**
 * Computes the select-all state using only currently actionable options.
 * @param items - Current option list.
 * @param selected - Stored values, including disabled or temporarily hidden options.
 * @returns The select-all checkbox state.
 */
export function checkboxAllState(items: readonly QuireKitCheckboxGroupItem[], selected: readonly string[]): boolean | "indeterminate" {
  const enabled = items.filter(item => !item.disabled);
  const count = enabled.filter(item => selected.includes(item.value)).length;
  return count === 0 ? false : count === enabled.length ? true : "indeterminate";
}
/**
 * Changes only enabled options without destroying other stored choices.
 * @param items - Current option list.
 * @param selected - Host or local values.
 * @returns Next selection after a select-all interaction.
 */
export function checkboxToggleAll(items: readonly QuireKitCheckboxGroupItem[], selected: readonly string[]): string[] {
  const enabled = items.filter(item => !item.disabled).map(item => item.value);
  if (checkboxAllState(items, selected) === true) return selected.filter(value => !enabled.includes(value));
  return [...new Set([...selected, ...enabled])];
}
