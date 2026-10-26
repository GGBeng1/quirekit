import type { WordTableWidth } from "@quirekit/classic-table-model";

/** @param width - Canonical preferred width. @returns CSS length without changing the stored unit. */
export function tableWidthCss(width: WordTableWidth | null | undefined): string | null {
  if (!width || width.value === null || width.unit === "auto" || width.unit === "nil") return null;
  return width.unit === "dxa" ? `${width.value / 20}pt` : width.unit === "pct" ? `${width.value / 50}%` : `${width.value}px`;
}
