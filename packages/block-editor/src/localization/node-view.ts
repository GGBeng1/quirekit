import type { Editor } from "@quirekit/core";
import { onBlockEditorLocaleChange, readBlockEditorLocale } from "./runtime";
import { translateBlockText } from "./text";
import type { BlockTextValues } from "./types";

/** @param editor - Canonical session. @param source - UI copy. @param values - Named values. @returns Current instance copy without subscribing to transactions. */
export function blockEditorText(editor: Editor, source: string, values?: BlockTextValues): string {
  return translateBlockText(readBlockEditorLocale(editor), source, values);
}

/** @param editor - Session owning a retained node. @param project - Updates only chrome text. @returns Release on NodeView or widget destruction. */
export function bindBlockNodeLocale(editor: Editor, project: () => void): () => void {
  project();
  return onBlockEditorLocaleChange(editor, project);
}
