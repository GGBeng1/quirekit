import type { Node } from "@quirekit/pm";
import type { WordTableBorder, WordTableCellMargins, WordTableRowHeight, WordTableWidth } from "../../../types";

/** Border looks Agents choose from. */
export type WordTableAgentBorderStyle = "none" | "thin-black" | "thin-accent" | "thin-red";

/** Table width as Agents write it. */
export type WordTableAgentWidth = { readonly unit: "points" | "percent"; readonly value: number };

/** Row height as Agents write it. */
export interface WordTableAgentRowHeight {
  /** Height in points. */
  readonly points: number;
  /** Minimum or exact height. */
  readonly rule: "at-least" | "exact";
}

const thinBorderBase = Object.freeze({ style: "single", size: 4, space: 0, shadow: false, frame: false } as const);

const borderPresets: Readonly<Record<WordTableAgentBorderStyle, WordTableBorder | null>> = Object.freeze({
  none: null,
  "thin-black": Object.freeze({ ...thinBorderBase, color: "auto" }),
  "thin-accent": Object.freeze({ ...thinBorderBase, color: "4472C4" }),
  "thin-red": Object.freeze({ ...thinBorderBase, color: "C00000" })
});

const emptyMargins: WordTableCellMargins = Object.freeze({ top: null, right: null, bottom: null, left: null });

/** @param value - Agent width. @returns Canonical Word width or null. */
export function toWordTableWidth(value: WordTableAgentWidth | null): WordTableWidth | null {
  if (value === null) return null;
  return value.unit === "points" ? { value: Math.round(value.value * 20), unit: "dxa" } : { value: Math.round(value.value * 50), unit: "pct" };
}

/** @param points - Point value. @returns Canonical dxa width or null. */
export function toWordTablePointWidth(points: number | null): WordTableWidth | null {
  return points === null ? null : { value: Math.round(points * 20), unit: "dxa" };
}

/** @param value - Agent height. @returns Canonical Word height or null. */
export function toWordTableRowHeight(value: WordTableAgentRowHeight | null): WordTableRowHeight | null {
  return value === null ? null : { value: Math.round(value.points * 20), rule: value.rule === "at-least" ? "atLeast" : "exact" };
}

/**
 * Keeps the other default margins while replacing one side.
 * @param doc - Document containing the table.
 * @param tablePosition - Position before the table.
 * @param side - Margin side to replace.
 * @param points - New point value, or null to clear.
 * @returns Complete canonical margin record.
 */
export function withWordTableDefaultMargin(doc: Node, tablePosition: number, side: keyof WordTableCellMargins, points: number | null): WordTableCellMargins {
  const current = doc.nodeAt(tablePosition)?.attrs.defaultCellMargins;
  const margins = current !== null && typeof current === "object" && !Array.isArray(current) ? current as WordTableCellMargins : emptyMargins;
  return { ...margins, [side]: toWordTablePointWidth(points) };
}

/** @param preset - Border look. @returns Canonical border value. */
export function toWordTableBorder(preset: WordTableAgentBorderStyle): WordTableBorder | null {
  return borderPresets[preset];
}
