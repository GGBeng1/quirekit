import type { EditorUILocale } from "../types";
import type { EditorUITableAxis } from "../types";

/**
 * Resolves indexed accessible copy for one materialized axis handle.
 *
 * @param locale - Product locale used for the visible tooltip and ARIA label.
 * @param axis - Row or column axis.
 * @param index - Zero-based source axis index.
 * @param move - Whether the selected handle owns reorder intent.
 * @returns Localized label containing the exact source index.
 */
export function createEditorUITableRailLabel(
  locale: EditorUILocale,
  axis: EditorUITableAxis,
  index: number,
  move: boolean
): string {
  const ordinal = index + 1;
  if (locale === "zh-CN") {
    return move
      ? `拖拽第 ${ordinal} ${axis === "row" ? "行" : "列"}调整顺序`
      : `选择第 ${ordinal} ${axis === "row" ? "行" : "列"}`;
  }
  const noun = axis === "row" ? "row" : "column";
  return move
    ? `Drag ${noun} ${ordinal} to reorder`
    : `Select ${noun} ${ordinal}`;
}
