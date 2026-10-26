import { translateBlockText } from "../../localization/text";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import type { BlockActionTarget } from "./types";

/** @param target - Captured block. @param locale - Product language. @returns Shared structural actions after the block has been selected on opening. */
export function blockStructureMenuItems(target: BlockActionTarget | null, locale = "zh-CN"): readonly QuireKitMenuEntry[] {
  return [
    { value: "before", label: "在上方插入", icon: "tableInsertRowAbove", disabled: !target },
    { value: "after", label: "在下方插入", icon: "tableInsertRowBelow", disabled: !target },
    { value: "copy", label: "复制", icon: "copy", disabled: !target },
    { value: "link", label: "复制块链接", icon: "link", disabled: !target || target.blocks.length !== 1 },
    ...(target?.block.node.type.name === "heading" && target.blocks.length === 1 ? [{ value: "copy-section", label: "复制章节", icon: "copy" }] : []),
    { value: "cut", label: "剪切", icon: "scissors", disabled: !target },
    { value: "duplicate", label: target && target.blocks.length > 1 ? "创建所选块副本" : "创建块副本", icon: "copy", disabled: !target },
    { value: "up", label: "上移一块", icon: "moveUp", disabled: !target?.previous },
    { value: "down", label: "下移一块", icon: "moveDown", disabled: !target?.next },
    { value: "delete", label: target && target.blocks.length > 1 ? translateBlockText(locale, "删除 {count} 个块", { count: target.blocks.length })
      : target?.block.node.type.name === "footnoteDefinition" ? "删除脚注及引用" : "删除块", icon: "trash", tone: "danger", disabled: !target }
  ];
}
