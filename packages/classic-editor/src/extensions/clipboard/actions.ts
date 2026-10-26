import type {
  ClassicEditorActionContextMenuItemContribution,
  ClassicEditorActionDefinition,
  ClassicEditorText
} from "@classic/types";
import { runClassicEditorClipboardOperation } from "./run";
import type { ClassicEditorClipboardOperation } from "./types";

/** Static row facts for one clipboard operation. */
interface ClipboardRow {
  /** Operation executed by the row. */
  readonly operation: ClassicEditorClipboardOperation;
  /** Localized label. */
  readonly label: ClassicEditorText;
  /** Icon id. */
  readonly icon: string;
  /** Keyboard alternative shown beside the label. */
  readonly shortcut: ClassicEditorText;
  /** Whether the operation changes the document. */
  readonly mutates: boolean;
  /** Whether the operation needs a non-empty selection. */
  readonly needsRange: boolean;
}

const rows: readonly ClipboardRow[] = [
  { operation: "cut", label: { "zh-CN": "剪切", en: "Cut" }, icon: "scissors", shortcut: "Ctrl+X", mutates: true, needsRange: true },
  { operation: "copy", label: { "zh-CN": "复制", en: "Copy" }, icon: "copy", shortcut: "Ctrl+C", mutates: false, needsRange: true },
  { operation: "paste", label: { "zh-CN": "粘贴（保留源格式）", en: "Paste (keep source formatting)" }, icon: "clipboardPaste", shortcut: "Ctrl+V", mutates: true, needsRange: false },
  { operation: "paste-text", label: { "zh-CN": "粘贴（只保留文本）", en: "Paste (keep text only)" }, icon: "type", shortcut: "Ctrl+Shift+V", mutates: true, needsRange: false }
];

/**
 * Creates the typed action for one clipboard row.
 *
 * @param row - Clipboard row facts.
 * @returns Action shared by every surface that offers the operation.
 */
function createAction(row: ClipboardRow): ClassicEditorActionDefinition {
  return {
    id: `clipboard.${row.operation}`,
    label: row.label,
    icon: row.icon,
    group: "clipboard",
    order: 0,
    canExecute: ({ editor }) => (!row.mutates || editor.isEditable)
      && (!row.needsRange || !editor.state.pm.selection.empty),
    run: context => runClassicEditorClipboardOperation(context, row.operation)
  };
}

/** Typed clipboard actions keyed by operation. */
export const classicEditorClipboardActions: Readonly<Record<ClassicEditorClipboardOperation, ClassicEditorActionDefinition>> =
  Object.freeze(Object.fromEntries(rows.map(row => [row.operation, createAction(row)])) as Record<
    ClassicEditorClipboardOperation,
    ClassicEditorActionDefinition
  >);

/** Generic text context-menu rows; hidden whenever an object menu owns the target. */
export const classicEditorClipboardContextMenuItems: readonly ClassicEditorActionContextMenuItemContribution[] =
  Object.freeze(rows.map((row, index) => ({
    kind: "context-menu-item" as const,
    id: `context.clipboard.${row.operation}`,
    role: "fallback" as const,
    section: "clipboard",
    order: 100 + index,
    label: row.label,
    icon: row.icon,
    shortcut: row.shortcut,
    action: classicEditorClipboardActions[row.operation]
  })));
