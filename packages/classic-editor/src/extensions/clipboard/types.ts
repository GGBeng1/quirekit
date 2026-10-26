/** Clipboard operation offered by product menus. */
export type ClassicEditorClipboardOperation = "copy" | "cut" | "paste" | "paste-text";

/** MIME entries captured from one editor copy, in write order. */
export type ClassicEditorClipboardEntries = readonly (readonly [type: string, value: string])[];

/** Rich and plain text read from the system clipboard. */
export interface ClassicEditorClipboardContent {
  /** HTML payload when the clipboard exposed one. */
  readonly html: string | null;
  /** Plain text payload; empty when the clipboard held no text. */
  readonly text: string;
  /** Private slice payload from the web custom format, when the browser exposed it. */
  readonly internal: string | null;
}

/** Options for the Classic clipboard capability. */
export interface ClassicEditorClipboardOptions {
  /** Whether cut, copy and paste rows are contributed to the text context menu. */
  readonly contextMenu: boolean;
  /** Whether compact text selections offer the shared clipboard actions. */
  readonly selectionPopup: boolean;
  /** Whether Ctrl/⌘+Shift+V pastes text only. */
  readonly plainTextPasteShortcut: boolean;
}
