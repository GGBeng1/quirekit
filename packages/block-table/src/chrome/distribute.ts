import type { Editor, QuireMountedTableChromeModel } from "@quirekit/core";
import type { BlockTableTarget } from "../ui/types";
import { tableTargetCurrent } from "./commands";
/**
 * Supplies measured HTML totals to the same structural distribution commands used by Classic.
 * @param editor - Semantic command owner.
 * @param target - Exact selected range.
 * @param model - Accepted physical sizing.
 * @param axis - Rows or columns.
 * @param dryRun - Availability without a document write.
 * @returns Whether the canonical operation is applicable or completed.
 */
export function distributeBlockTable(editor: Editor, target: BlockTableTarget, model: QuireMountedTableChromeModel, axis: "row" | "column", dryRun = false): boolean {
 if (!tableTargetCurrent(editor, target) || model.sourceDocument !== target.doc || !model.sizing) return false;
 const sizes = axis === "row" ? model.sizing.rowHeights : model.sizing.columnWidths;
 const span = axis === "row" ? target.rect.rowSpan : target.rect.columnSpan;
 const from = span > 1 ? axis === "row" ? target.rect.startRow : target.rect.startColumn : 0;
 const to = span > 1 ? from + span - 1 : sizes.length - 1;
 if (to <= from) return false;
 const total = Math.round(sizes.slice(from, to + 1).reduce((sum, size) => sum + size, 0) * 15);
 const commands = dryRun ? editor.can() : editor.commands;
 if (!dryRun) editor.commands.closeHistory();
 return axis === "row" ? commands.distributeWordTableRows({ tablePos: target.tablePos, from, to, totalHeight: { value: total, rule: "atLeast" } })
  : commands.distributeWordTableColumns({ tablePos: target.tablePos, from, to, totalWidth: { value: total, unit: "dxa" } });
}
