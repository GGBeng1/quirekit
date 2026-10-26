/** Available readings of an unmodified unified diff. */
export type QuireKitDiffViewerView = 'diff' | 'source';

/** Read-only unified-diff inspection; patch text remains the copy authority. */
export interface QuireKitDiffViewerProps {
  /** Original unified diff, including metadata and trailing whitespace. */
  readonly patch: string;
  /** Accessible name for the viewer; defaults to the language pack's generic name. */
  readonly label?: string;
  /** Controlled view. Invalid or oversized patches always use source. */
  readonly view?: QuireKitDiffViewerView;
  /** Initial view when view is uncontrolled. */
  readonly defaultView?: QuireKitDiffViewerView;
  /** Maximum source characters admitted to structured parsing. */
  readonly maxStructuredCharacters?: number;
  /** Initial number of lines shown per hunk; hidden lines can be revealed. */
  readonly maxVisibleLines?: number;
  /** Height of the scrollable reading area in CSS pixels. */
  readonly maxHeight?: number;
}
