import type { EditorBlockMenuProvider } from "@quirekit/editor-ui";
import { horizontalRulePresets } from "@quirekit/extension-horizontal-rule";
import { changeBlockRule } from "./commands";
import { blockRulePresetLabels } from "./presets";

/** Canonical divider appearance, available from both its object tools and the block menu. */
export const blockRuleMenu: EditorBlockMenuProvider = {
  id: "rule", order: 10,
  /** @param context - Captured divider. @returns Its supported style and width controls. */
  getItems({ editor, block }) {
    if (block.node.type.name !== "horizontalRule") return [];
    const target = { doc: editor.state.doc, node: block.node, pos: block.from };
    return [
      { value: "style", label: "分隔线样式", icon: "horizontalRule", kind: "submenu", children: horizontalRulePresets.map(preset => ({
        value: `style:${preset.id}`, label: blockRulePresetLabels[preset.id] ?? preset.label,
        run: () => changeBlockRule(editor, target, preset.style)
      })) },
      { value: "width", label: "分隔线宽度", icon: "ruler", kind: "submenu", children: [25, 50, 75, 100].map(widthPercent => ({
        value: `width:${widthPercent}`, label: `${widthPercent}%`, checked: block.node.attrs.widthPercent === widthPercent,
        run: () => changeBlockRule(editor, target, { widthPercent })
      })) }
    ];
  }
};
