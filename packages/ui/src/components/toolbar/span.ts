import type { QuireKitToolbarEntry } from "./types";

/** Width of an icon control with a disclosure indicator or a split disclosure. */
const indicatedIconSpan = 1.5;

/**
 * Resolves an entry's width in toolbar units.
 *
 * One unit is an icon action. Icon controls that also show a disclosure
 * indicator, and icon split buttons, take one and a half units. Entries with
 * visible text, custom controls, groups, and separators keep their natural width
 * unless they declare a span.
 *
 * @param entry - Toolbar entry.
 * @returns Span in units, or null for natural width.
 */
export function resolveQuireKitToolbarEntrySpan(entry: QuireKitToolbarEntry): number | null {
  if (entry.span !== undefined) return entry.span > 0 ? entry.span : null;
  const kind = entry.kind ?? "action";
  if (kind === "separator" || kind === "group" || kind === "custom" || kind === "selector") return null;
  const hasIcon = entry.icon !== undefined || entry.iconData !== undefined;
  if (!hasIcon || entry.text !== undefined) return null;
  if (kind === "split") return indicatedIconSpan;
  if (kind === "menu") return entry.trigger !== "disclosure" ? null : entry.indicator === false ? 1 : indicatedIconSpan;
  if (kind === "disclosure") return entry.indicator === true ? indicatedIconSpan : 1;
  return 1;
}

/**
 * Sums the unit widths of entries whose spans resolve.
 *
 * @param entries - Row entries.
 * @returns Total units, ignoring hidden and natural-width entries.
 */
export function sumQuireKitToolbarSpans(entries: readonly QuireKitToolbarEntry[]): number {
  return entries.reduce((total, entry) => {
    if (entry.hidden === true) return total;
    if (entry.kind === "group") return total + sumQuireKitToolbarSpans(entry.children ?? []);
    return total + (resolveQuireKitToolbarEntrySpan(entry) ?? 0);
  }, 0);
}
