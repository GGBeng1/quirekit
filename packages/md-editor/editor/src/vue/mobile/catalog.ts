import type { QuireKitActionMenuEntry, QuireKitMenuEntry, QuireKitToolbarEntry } from "@quirekit/ui";

/** @param table - Canonical contextual group. @returns Actual table commands contributed to the adaptive row, with no fixed More entry. */
export function mobileTableToolbar(table: QuireKitToolbarEntry | undefined): readonly QuireKitToolbarEntry[] {
  if (!table || table.hidden) return [];
  const children = (table.children ?? []).filter(entry => entry.value !== "row" && entry.value !== "column").flatMap<QuireKitToolbarEntry>(entry => entry.items ? mobileActionDirectory(entry.items).map(action => ({
    value: action.value, label: action.label, ...((action.icon ?? entry.icon) ? { icon: (action.icon ?? entry.icon)! } : {}), disabled: !!entry.disabled || !!action.disabled,
  })) : [entry]);
  return [{ value: table.value, label: table.label, kind: "group", children }];
}
/** @param entries - Canonical installed menu entries. @param group - Parent heading. @returns Flat action directory, preserving identity, availability and host order. */
export function mobileActionDirectory(entries: readonly QuireKitMenuEntry[], group?: string): readonly QuireKitActionMenuEntry[] {
  return entries.flatMap(entry => entry.kind === "separator" ? [] : entry.kind === "group"
    ? mobileActionDirectory(entry.children ?? [], entry.label) : [{ kind: "command" as const, value: entry.value, label: entry.label,
      ...(entry.icon ? { icon: entry.icon } : {}), ...(entry.disabled ? { disabled: true } : {}), ...(group ? { group } : {}) }]);
}

/** @param entries - Shared source catalog. @returns Mobile order with contiguous common actions first and text conversion last. */
export function mobileInsertionDirectory(entries: readonly QuireKitMenuEntry[]): readonly QuireKitActionMenuEntry[] {
  return mobileActionDirectory([
    ...entries.filter(entry => entry.value === "common" || entry.value === "inline"),
    ...entries.filter(entry => !["common", "inline", "text"].includes(entry.value)),
    ...entries.filter(entry => entry.value === "text"),
  ]);
}

/** @param value - Stable installed command. @returns Product decoration using semantic theme colors. */
export function insertionIconTone(value: string): string {
  if (value === "image" || value === "emoji") return "media";
  if (value === "insert-warning") return "warning";
  if (["textDiagram", "flowchart", "mindMap", "whiteboard", "inlineMath", "displayMath"].includes(value)) return "diagram";
  if (["link", "date", "mention", "insert-table", "insert-note"].includes(value)) return "accent";
  return "neutral";
}
