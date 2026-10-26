/** One noninteractive marker sample shared by editor list galleries. */
export interface EditorListPreviewLine {
  /** Resolved marker text. */
  readonly marker: string;
  /** Visual nesting level in the thumbnail. */
  readonly depth: number;
}
/** One installed preset presented without coupling UI to its document schema. */
export interface EditorListPresetItem {
  /** Canonical preset identity. */
  readonly value: string;
  /** Accessible localized name. */
  readonly label: string;
  /** Single-level or multilevel group. */
  readonly scope: string;
  /** Resolved thumbnail lines. */
  readonly lines: readonly EditorListPreviewLine[];
}
/** Localized scope tab. */
export interface EditorListPresetScope {
  /** Scope identity. */
  readonly value: string;
  /** Visible name. */
  readonly label: string;
}
