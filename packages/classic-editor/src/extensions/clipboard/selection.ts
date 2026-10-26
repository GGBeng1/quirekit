import type { ClassicEditorActionSelectionPopupItemContribution } from "@classic/types";
import { classicEditorClipboardActions } from "./actions";

/** Feature-owned compact entries; default desktop toolbars retain keyboard copy. */
export const classicEditorClipboardSelectionItems: readonly ClassicEditorActionSelectionPopupItemContribution[] =
  (["copy", "cut", "paste", "paste-text"] as const).map((operation, index) => ({
    kind: "selection-popup-item",
    id: `selection.clipboard.${operation}`,
    order: index,
    label: operation === "paste" ? { "zh-CN": "粘贴", en: "Paste" } : classicEditorClipboardActions[operation].label,
    icon: classicEditorClipboardActions[operation].icon,
    action: classicEditorClipboardActions[operation],
    ...(operation === "paste-text" ? { placement: "overflow" as const } : { compact: "primary" as const }),
    whenTrigger: (_trigger, context) => context.root.dataset.layout === "compact",
    dismissAfterExecute: true,
    restoreEditorFocus: false
  }));
