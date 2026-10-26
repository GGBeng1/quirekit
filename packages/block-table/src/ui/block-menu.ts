import { createWordTableMap } from "@quirekit/classic-table-model";
import type { EditorBlockMenuItem, EditorBlockMenuProvider } from "@quirekit/editor-ui";
import { measureBlockTable } from "../chrome/geometry";
import { distributeBlockTable } from "../chrome/distribute";
import { executeTableAction } from "./actions";
import type { BlockTableAction, BlockTableTarget } from "./types";

/** Whole-table actions, contributed by the optional table package rather than the Block shell. */
export const blockTableMenu: EditorBlockMenuProvider = {
  id: "table", order: 10,
  /** @param context - Captured whole table. @returns Commands whose explicit range covers only that table. */
  getItems({ editor, block }) {
    if (block.node.type.name !== "wordTable") return [];
    const map = createWordTableMap(block.node);
    const target: BlockTableTarget = { doc: editor.state.doc, tablePos: block.from, map, rect: { startRow: 0, startColumn: 0, rowSpan: map.height, columnSpan: map.width } };
    // Read only the invoked table at menu opening; hover never measures every cell.
    const model = typeof HTMLTableElement === "undefined" ? null : measureBlockTable(editor, target);
    /** @param value - Existing canonical operation. @param label - Visible label. @param icon - Registered action artwork. @returns Source-bound table command. */
    const action = (value: BlockTableAction, label: string, icon: string): EditorBlockMenuItem => ({ value, label, icon,
      isEnabled: () => executeTableAction(editor, target, value, true), run: () => executeTableAction(editor, target, value) });
    return [
      ...(["column", "row"] as const).map(axis => ({ value: `distribute:${axis}`, label: axis === "column" ? "平均分布各列" : "平均分布各行", icon: axis === "column" ? "tableDistributeColumns" : "tableDistributeRows",
        isEnabled: () => !!model && distributeBlockTable(editor, target, model, axis, true),
        run: () => !!model && distributeBlockTable(editor, target, model, axis) })),
      { value: "alignment", label: "单元格对齐", icon: "tableAlignCenter", kind: "submenu", children: [action("alignTop", "顶端对齐", "tableAlignTop"), action("alignCenter", "垂直居中", "tableAlignCenter"), action("alignBottom", "底端对齐", "tableAlignBottom")] },
      action("clearFormat", "清除表格格式", "clearFormatting"), action("clear", "清空表格内容", "listX")
    ];
  }
};
