import type { QuireKitToolbarEntry } from "../../../components/toolbar/types";
import type { ToolbarCollapseSlot, ToolbarCollapseSplit } from "./types";

/**
 * Lists collapsible controls in display order; groups contribute their visible children.
 * @param items - Configured top-level entries.
 * @returns Controls with stable measurement keys.
 */
export function listToolbarCollapseSlots(items: readonly QuireKitToolbarEntry[]): readonly ToolbarCollapseSlot[] {
  const slots: ToolbarCollapseSlot[] = [];
  for (const entry of items) {
    if (entry.hidden) continue;
    if (entry.kind !== "group") {
      slots.push({ key: entry.value, entry });
      continue;
    }
    for (const child of entry.children ?? []) {
      if (!child.hidden) slots.push({ key: toolbarCollapseKey(entry, child), entry: child, group: entry });
    }
  }
  return slots;
}

/**
 * @param group - Owning top-level group.
 * @param child - Grouped control.
 * @returns Measurement key shared by the template and the layout.
 */
export function toolbarCollapseKey(group: QuireKitToolbarEntry, child: QuireKitToolbarEntry): string {
  return `${group.value}/${child.value}`;
}

/**
 * Rebuilds row and panel entries from the first `count` controls.
 * @param slots - Controls in display order.
 * @param count - Number of leading controls kept in the row.
 * @returns Row entries and panel entries, each regrouped under their original groups.
 */
export function splitToolbarCollapseSlots(slots: readonly ToolbarCollapseSlot[], count: number): ToolbarCollapseSplit {
  const collapsed = regroup(slots.slice(count));
  while (collapsed[0]?.kind === "separator") collapsed.shift();
  return { visible: regroup(slots.slice(0, count)), collapsed };
}

/**
 * @param slots - Consecutive controls.
 * @returns Top-level entries with consecutive grouped controls folded back into their group.
 */
function regroup(slots: readonly ToolbarCollapseSlot[]): QuireKitToolbarEntry[] {
  const entries: QuireKitToolbarEntry[] = [];
  for (const slot of slots) {
    const last = entries.at(-1);
    if (slot.group === undefined) entries.push(slot.entry);
    else if (last !== undefined && last.value === slot.group.value && last.kind === "group") {
      entries[entries.length - 1] = { ...last, children: [...(last.children ?? []), slot.entry] };
    } else {
      entries.push({ ...slot.group, children: [slot.entry] });
    }
  }
  return entries;
}
