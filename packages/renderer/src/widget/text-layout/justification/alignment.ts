import type { ShapedRunData } from "../shaping";
import type { QuireTextLayoutOptions } from "../types";
import type { LineRun, LineSlotRun } from "../wrap";
import { canDistributeGrapheme, expandSlotAdvances } from "./spacing";
import { applyAutomaticSpacing } from "../auto-spacing/boundaries";
import type { TextSlotAlignment } from "./types";

/**
 * Aligns a naturally wrapped slot before paint, caret and hit geometry are built.
 * @param options - Shared paragraph policy, already projected from document semantics.
 * @param line - Wrapped source line; pagination never reclassifies its ending.
 * @param slot - Available physical slot and source graphemes.
 * @param advances - Mutable copy of natural advances, not the cached shaping product.
 * @param shaped - Immutable shaping data used to protect required clusters.
 * @returns Shared physical placement and independently positioned cluster deltas.
 */
export function resolveTextSlotAlignment(
  options: QuireTextLayoutOptions,
  line: LineRun,
  slot: LineSlotRun,
  advances: number[],
  shaped: ReadonlyMap<number, ShapedRunData>
): TextSlotAlignment {
  const { alignment } = options;
  const singleSlot = line.slotRuns.length === 1;
  // Distribute owns every line, including paragraph ends and Shift+Enter. The
  // soft-break compatibility switch belongs exclusively to ordinary justification.
  const expand = singleSlot && (alignment === "distribute" || (alignment === "justify"
    && line.ending !== "paragraph-end"
    && (line.ending !== "soft-break" || options.justifySoftBreaks !== false)));
  const spacing = slot.graphemes[0]?.naturalAdvance === undefined
    ? applyAutomaticSpacing(slot.graphemes, advances) : new Map<number, number>();
  if (expand) {
    const expanded = expandSlotAdvances(slot.graphemes, advances, slot.slot.width, shaped, alignment);
    for (const [index, delta] of expanded) spacing.set(index, (spacing.get(index) ?? 0) + delta);
  }
  const width = advances.reduce((sum, advance) => sum + advance, 0);
  const remaining = Number.isFinite(slot.slot.width) ? Math.max(slot.slot.width - width, 0) : 0;
  const only = slot.graphemes.length === 1 ? slot.graphemes[0] : undefined;
  const centerSingle = alignment === "distribute" && singleSlot && only !== undefined
    && only.text !== " " && canDistributeGrapheme(only);
  let x = slot.slot.x;
  if (alignment === "center" || centerSingle) {
    x += remaining / 2;
  } else if (alignment !== undefined) {
    const direction = options.baseDirection ?? "auto";
    const level = slot.graphemes.find(grapheme => grapheme.level !== undefined)?.level;
    const rtl = direction === "rtl" || (direction === "auto" && level !== undefined && level % 2 === 1);
    if (alignment === "end" ? !rtl : rtl) x += remaining;
  }
  return { x, width, spacing };
}
