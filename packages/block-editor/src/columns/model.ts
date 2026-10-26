import type { QuireJSONContent } from "@quirekit/core";
/** @param value - Untrusted ratios. @returns Whether every column stays operable. */
export function validColumnWidths(value: unknown): value is number[] {
  return Array.isArray(value) && value.length >= 2 && value.length <= 4
    && value.every(width => typeof width === "number" && Number.isFinite(width) && width >= 10 && width <= 80)
    && Math.abs(value.reduce((total, width) => total + width, 0) - 100) < 0.1;
}
/** @param widths - Relative column widths. @returns Empty editable columns. */
export function createColumns(widths: readonly number[]): QuireJSONContent {
  return { type: "blockColumns", attrs: { widths: [...widths] }, content: widths.map(() => ({ type: "blockColumn", content: [{ type: "paragraph" }] })) };
}
