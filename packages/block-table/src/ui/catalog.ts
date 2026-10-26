import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { Editor } from "@quirekit/core";
import type { BlockTableTarget, BlockTableAction } from "./types";
import { executeTableAction } from "./actions";

/** @param editor - Command owner. @param target - Captured cell range. @returns Compact contextual tools backed by the same Classic commands. */
export function tableToolbarItems(editor: Editor, target: BlockTableTarget): readonly QuireKitToolbarEntry[] {
  /** @param value - Existing canonical operation. @param label - Accessible name. @param icon - Shared table icon. @returns Admitted toolbar action. */
  const action = (value: BlockTableAction, label: string, icon: string) => ({ value, label, icon, disabled: !executeTableAction(editor, target, value, true) });
  return [
    { value: "styles", label: "表格风格", icon: "tableStyle", kind: "disclosure", contentRenderer: "styles", overlayProps: { width: "auto" } },
    { value: "appearance", kind: "separator", label: "" },
    { value: "rows", label: "行操作", icon: "tableSelectRow", kind: "menu", trigger: "disclosure", items: [
      action("rowBefore", "在上方插入行", "tableInsertRowAbove"), action("rowAfter", "在下方插入行", "tableInsertRowBelow"), action("selectRow", "选择整行", "tableSelectRow"), action("deleteRows", "删除选中行", "tableDeleteRow")
    ] },
    { value: "columns", label: "列操作", icon: "tableSelectColumn", kind: "menu", trigger: "disclosure", items: [
      action("columnBefore", "在左侧插入列", "tableInsertColumnLeft"), action("columnAfter", "在右侧插入列", "tableInsertColumnRight"), action("selectColumn", "选择整列", "tableSelectColumn"), action("deleteColumns", "删除选中列", "tableDeleteColumn")
    ] },
    { value: "structure", kind: "separator", label: "" },
    action("merge", "合并单元格", "tableMergeCells"), action("split", "取消合并", "tableSplitCell"),
    { value: "align", label: "单元格对齐", icon: "tableAlignCenter", kind: "menu", trigger: "disclosure", items: [action("alignTop", "顶端对齐", "tableAlignTop"), action("alignCenter", "垂直居中", "tableAlignCenter"), action("alignBottom", "底端对齐", "tableAlignBottom")] },
    { value: "fill", label: "单元格底色", icon: "fillColor", kind: "custom", renderer: "fill", popup: "dialog" },
    { value: "more", label: "更多表格操作", icon: "moreHorizontal", kind: "menu", trigger: "disclosure", indicator: false, items: [
      { value: "distributeRows", label: "平均分布各行", icon: "tableDistributeRows", disabled: target.map.height < 2 },
      { value: "distributeColumns", label: "平均分布各列", icon: "tableDistributeColumns", disabled: target.map.width < 2 },
      action("selectTable", "选择整表", "table"), action("clearFormat", "清除单元格格式", "clearFormatting"), action("clear", "清空单元格", "listX"),
      { ...action("deleteTable", "删除表格", "trash"), tone: "danger" }
    ] }
  ];
}
