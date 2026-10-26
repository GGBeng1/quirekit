import type { TextCaseMode } from "@quirekit/extensions";
import type { ClassicEditorActionDefinition, ClassicEditorBilingualText } from "../../types";

/** Word "Change Case" menu rows in menu order. */
export const classicEditorTextCaseModes: readonly { readonly mode: TextCaseMode; readonly label: ClassicEditorBilingualText }[] = [
  { mode: "sentence", label: { "zh-CN": "句首字母大写", en: "Sentence case." } },
  { mode: "lower", label: { "zh-CN": "全部小写", en: "lowercase" } },
  { mode: "upper", label: { "zh-CN": "全部大写", en: "UPPERCASE" } },
  { mode: "capitalize", label: { "zh-CN": "每个单词首字母大写", en: "Capitalize Each Word" } },
  { mode: "toggle", label: { "zh-CN": "切换大小写", en: "tOGGLE cASE" } },
  { mode: "halfwidth", label: { "zh-CN": "半角", en: "Half-width" } },
  { mode: "fullwidth", label: { "zh-CN": "全角", en: "Full-width" } }
];

/** Menu label shared by the ribbon button and the selection popup submenu. */
export const classicEditorTextCaseLabel: ClassicEditorBilingualText = { "zh-CN": "更改大小写", en: "Change Case" };

/** Typed actions keyed by mode. */
export const classicEditorTextCaseActions: Readonly<Record<TextCaseMode, ClassicEditorActionDefinition>> = Object.freeze(
  Object.fromEntries(classicEditorTextCaseModes.map(({ mode, label }, index) => [mode, {
    id: `text-case.${mode}`,
    label,
    icon: "caseSensitive",
    group: "text-case",
    order: index,
    canExecute: ({ editor }) => editor.isEditable && editor.can().changeTextCase(mode),
    run: ({ editor }) => editor.commands.changeTextCase(mode)
  } satisfies ClassicEditorActionDefinition])) as Record<TextCaseMode, ClassicEditorActionDefinition>
);
