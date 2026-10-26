import type { EditorState } from "@quirekit/cm-state";
import { definePresentationSetting, defineState, type MsfeEditor, type MsfeResult, type StateSlot } from "@quirekit/msfe-core";

const visibility = definePresentationSetting((value): value is boolean => typeof value === "boolean");
const collapse = definePresentationSetting((value): value is boolean => typeof value === "boolean");
/** Identity changes only when a new canonical document is installed. */
export const propertiesDocument = defineState({ key: "document-properties-lifetime", create: () => Symbol("properties-document"), update: value => value });

/** @param initial - Explicit installation preference. @returns Input-deferred, history-neutral layer dependency. */
export function propertiesEnabled(initial: boolean): StateSlot<boolean> {
  return { key: "document-properties-enabled", extension: visibility.extension(() => initial), read: state => visibility.read(state) ?? false };
}

/** @param state - Canonical editor state. @returns Effective property visibility, false when not installed. */
export function documentPropertiesEnabled(state: EditorState): boolean { return visibility.read(state) ?? false; }

/** @param editor - Mounted canonical owner. @param enabled - Requested visibility. @returns Acceptance without source, selection or history changes. */
export function setDocumentPropertiesEnabled(editor: MsfeEditor, enabled: boolean): MsfeResult { return visibility.set(editor, enabled); }

/** @param initial - Initial state for each document. @returns Input-deferred presentation dependency. */
export function propertiesCollapsed(initial: boolean): StateSlot<boolean> {
  return { key: "document-properties-collapsed", extension: collapse.extension(() => initial), read: state => collapse.read(state) ?? false };
}

/** @param state - Canonical editor state. @returns Applied collapsed state, false when not installed. */
export function documentPropertiesCollapsed(state: EditorState): boolean { return collapse.read(state) ?? false; }

/** @param editor - Mounted owner. @param collapsed - Requested panel state. @returns Readonly-safe presentation result without source or history changes. */
export function setDocumentPropertiesCollapsed(editor: MsfeEditor, collapsed: boolean): MsfeResult { return collapse.set(editor, collapsed); }
