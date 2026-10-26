import type { Editor } from "@quirekit/core";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { BlockFormattingState } from "../state/types";
import { readBlockListFeature } from "../../lists/feature";

/**
 * Builds the fixed-size toolbar from one shared formatting summary.
 * @param editor - Installed commands and schema.
 * @param state - Current selection summary.
 * @param editable - Whether editing commands are available.
 * @param undo - History undo availability.
 * @param redo - History redo availability.
 * @returns Public QuireKit Toolbar configuration.
 */
export function blockToolbarItems(editor: Editor, state: BlockFormattingState, editable: boolean, undo: boolean, redo: boolean): readonly QuireKitToolbarEntry[] {
  const disabled = !editable;
  const { marks, nodes } = editor.state.schema;
  const paragraphs = !!editor.commands.setBlockParagraph;
  const lists = readBlockListFeature(editor);
  const scriptItems = [
    ...(marks.superscript ? [{ value: "superscript", label: "上标", icon: "superscript" }] : []),
    ...(marks.subscript ? [{ value: "subscript", label: "下标", icon: "subscript" }] : [])
  ];
  return [
    { value: "history", label: "历史", kind: "group", children: [
      { value: "undo", label: "撤销", icon: "undo", disabled: disabled || !undo },
      { value: "redo", label: "重做", icon: "redo", disabled: disabled || !redo },
      { value: "formatPainter", label: "格式刷", icon: "formatPainter", kind: "toggle", pressed: state.painter, disabled: disabled || !editor.commands.toggleFormatPainter },
      { value: "copyFormatting", label: "复制格式", icon: "copy", tooltip: "复制当前文字格式，供其他文字使用", disabled: disabled || !editor.commands.copyFormatting },
      { value: "pasteFormatting", label: "粘贴格式", icon: "clipboard", tooltip: state.hasCopiedFormat ? "将已复制的格式应用到当前选区" : "请先复制格式", disabled: disabled || !state.hasCopiedFormat || !editor.commands.pasteFormatting },
      { value: "clearFormatting", label: "清除格式", icon: "clearFormatting", disabled: disabled || !editor.commands.clearFormatting }
    ] },
    { value: "history-separator", label: "", kind: "separator" },
    { value: "text", label: "文本", kind: "group", disabled, children: [
      { value: "fontTarget", label: "字体作用范围", icon: "fontScript", kind: "menu", trigger: "disclosure", items: [
        { value: "font-settings", label: "字体配置", icon: "settings" },
        { value: "font-target:all", label: "所有文字" }, { value: "font-target:eastAsia", label: "中文字体" },
        { value: "font-target:latin", label: "西文字体" }, { value: "font-target:complexScript", label: "复杂文字字体" }
      ] },
      { value: "font", label: "字体", kind: "custom", renderer: "field", popup: "listbox", disabled: !marks.textStyle },
      { value: "size", label: "字号", kind: "custom", renderer: "field", popup: "listbox", disabled: !marks.textStyle },
      { value: "font-settings", label: "字体配置", icon: "fontLibrary" },
      { value: "growFont", label: "增大字号", icon: "fontSizeIncrease", disabled: !editor.commands.increaseFontSize },
      { value: "shrinkFont", label: "减小字号", icon: "fontSizeDecrease", disabled: !editor.commands.decreaseFontSize },
      ...[["bold", "加粗"], ["italic", "斜体"]].map(([value, label]) => ({
        value: value!, label: label!, icon: value!, disabled: !marks[value!], kind: "toggle" as const, pressed: state.marks[value!] ?? false
      })),
      { value: "underline", label: "下划线", icon: "underline", kind: "split", contentRenderer: "underline",
        disclosureLabel: "下划线样式", pressed: state.marks.underline ?? false, disabled: !marks.underline || !editor.commands.setUnderline },
      { value: "strike", label: "删除线", icon: "strike", kind: "toggle", pressed: state.marks.strike ?? false, disabled: !marks.strike },
      ...scriptItems.map(item => ({ ...item, kind: "toggle" as const, pressed: state.marks[item.value] ?? false })),
      { value: "code", label: "行内代码", icon: "codeXml", kind: "toggle", pressed: state.marks.code ?? false, disabled: !marks.code },
      { value: "color", label: "文字颜色", icon: "textColor", iconAccentColor: state.color || "#000000", disabled: !marks.textStyle, kind: "custom", renderer: "color", popup: "dialog" },
      { value: "background", label: "文字高亮", icon: "textHighlight", iconAccentColor: state.background || "#fef08a", disabled: !marks.textStyle, kind: "custom", renderer: "color", popup: "dialog" }
    ] },
    { value: "text-separator", label: "", kind: "separator" },
    { value: "paragraph-format", label: "段落", kind: "group", disabled, children: [
      { value: "block", label: "段落类型", kind: "custom", renderer: "field", popup: "listbox" },
      { value: "bulletList", label: "无序列表", disabled: !lists && !nodes.bulletList, icon: "listBullet", kind: lists ? "split" : "toggle", pressed: state.list === "bullet", disclosureLabel: "项目符号预设" },
      { value: "orderedList", label: "有序列表", disabled: !lists && !nodes.orderedList, icon: "listNumbered", kind: lists ? "split" : "toggle", pressed: state.list === "ordered", disclosureLabel: "编号预设" },
      ...(lists ? [{ value: "taskList", label: "任务列表", icon: "listTask", kind: "toggle" as const, pressed: state.list === "task" }] : []),
      ...(paragraphs ? [{ value: "alignment", label: "段落对齐", icon: ({ start: "alignLeft", center: "alignCenter", end: "alignRight", justify: "alignJustify" } as Readonly<Record<string, string>>)[String(state.paragraph?.alignment ?? "start")] ?? "alignLeft", kind: "menu" as const, trigger: "disclosure" as const, disabled: !state.paragraph,
        items: ["start", "center", "end", "justify"].map((value, index) => ({ value: `align:${value}`, label: ["左对齐", "居中对齐", "右对齐", "两端对齐"][index]!, icon: ["alignLeft", "alignCenter", "alignRight", "alignJustify"][index]!, checked: state.paragraph?.alignment === value })) },
        { value: "paragraphSettings", label: "段落设置", icon: "slidersHorizontal", kind: "disclosure" as const, contentRenderer: "paragraph", disabled: !state.paragraph }] : []),
      { value: "indent", label: "增加缩进", icon: "indentIncrease" },
      { value: "outdent", label: "减少缩进", icon: "indentDecrease" }
    ] },
    { value: "insert-separator", label: "", kind: "separator" },
    { value: "insert-content", label: "插入内容", kind: "group", children: [
      { value: "search", label: "查找替换", icon: "search", disabled: typeof editor.commands.setSearchQuery !== "function" },
      { value: "link", label: "链接", disabled: disabled || !marks.link, icon: "link" },
      { value: "insert", label: "插入", disabled, text: "插入", icon: "insert", kind: "custom", renderer: "insert", popup: "menu" }
    ] }
  ];
}
