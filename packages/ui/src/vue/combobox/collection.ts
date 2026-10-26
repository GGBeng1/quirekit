import type {
  QuireKitComboboxGroup,
  QuireKitComboboxItem
} from "../../components/combobox";

/**
 * Groups visible candidates by first group appearance without changing item order.
 *
 * @param items - Current filtered Combobox candidates.
 * @returns Visible groups whose flattened order matches keyboard navigation.
 */
export function groupComboboxItems(
  items: readonly QuireKitComboboxItem[]
): QuireKitComboboxGroup[] {
  const groups = new Map<string | undefined, QuireKitComboboxItem[]>();
  for (const item of items) {
    const entries = groups.get(item.group) ?? [];
    entries.push(item);
    groups.set(item.group, entries);
  }
  return [...groups].map(([label, entries]) => ({ label, items: entries }));
}
